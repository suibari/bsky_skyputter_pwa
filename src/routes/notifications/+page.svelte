<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { AppBskyNotificationListNotifications, AppBskyFeedDefs } from '@atproto/api';
	import NotificationItem from '$lib/components/NotificationItem.svelte';
	import InfiniteScroll from '$lib/components/InfiniteScroll.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { getSession } from '$lib/stores/auth.svelte';
	import { setUnreadCount } from '$lib/stores/notifications.svelte';
	import { showToast } from '$lib/stores/toast.svelte';
	import { createAgent } from '$lib/api/agent';
	import { listNotifications, markSeen } from '$lib/api/notifications';
	import { createLike } from '$lib/api/posts';

	type Notification = AppBskyNotificationListNotifications.Notification;

	let notifications = $state<Notification[]>([]);
	let cursor = $state<string | undefined>(undefined);
	let loading = $state(false);
	let initialLoaded = $state(false);
	let hasMore = $state(true);
	let subjectPostMap = $state<Map<string, AppBskyFeedDefs.PostView>>(new Map());
	let likedUris = $state<Set<string>>(new Set());
	let replyMap = $state<Map<string, string[]>>(new Map());

	const THREAD_REASONS = ['reply', 'mention', 'quote', 'subscribed-post'];

	function didFromUri(uri: string): string | undefined {
		return uri.match(/^at:\/\/(did:[^/]+)/)?.[1];
	}

	function extractFromThread(
		thread: unknown,
		postMap: Map<string, AppBskyFeedDefs.PostView>,
		childMap: Map<string, string[]>
	) {
		const t = thread as {
			$type?: string;
			post?: AppBskyFeedDefs.PostView;
			parent?: unknown;
			replies?: unknown[];
		};
		if (!t || t.$type !== 'app.bsky.feed.defs#threadViewPost' || !t.post) return;
		postMap.set(t.post.uri, t.post);
		if (t.parent) extractFromThread(t.parent, postMap, childMap);
		if (t.replies && t.replies.length > 0) {
			const childUris = (
				t.replies as { $type?: string; post?: AppBskyFeedDefs.PostView }[]
			)
				.filter((r) => r.$type === 'app.bsky.feed.defs#threadViewPost' && r.post)
				.map((r) => r.post!.uri);
			if (childUris.length > 0) childMap.set(t.post.uri, childUris);
			for (const reply of t.replies) extractFromThread(reply, postMap, childMap);
		}
	}

	async function fetchSubjectPosts(newNotifications: Notification[]) {
		// like/repost/quote の subject ポスト（自分の投稿）を取得
		const subjectUris = newNotifications
			.filter((n) => ['like', 'repost', 'quote'].includes(n.reason) && n.reasonSubject)
			.map((n) => n.reasonSubject as string);
		// reply/mention/quote/subscribed-post の通知投稿本体を取得
		const notifUris = newNotifications
			.filter((n) => THREAD_REASONS.includes(n.reason))
			.map((n) => n.uri);

		const uris = [...new Set([...subjectUris, ...notifUris])].filter((uri) => !subjectPostMap.has(uri));
		if (uris.length === 0) return;

		try {
			const agent = await createAgent();
			const next = new Map(subjectPostMap);
			const nextLiked = new Set(likedUris);

			const res = await agent.api.app.bsky.feed.getPosts({ uris });
			for (const post of res.data.posts) {
				next.set(post.uri, post);
				if ((post.viewer as { like?: string } | undefined)?.like) nextLiked.add(post.uri);
			}

			// 通知投稿の同一著者連続自己リプライを最大3レベルまで遡って取得
			let frontier = notifUris.filter((u) => next.has(u));
			for (let level = 0; level < 3; level++) {
				const parentUris: string[] = [];
				for (const uri of frontier) {
					const post = next.get(uri);
					if (!post) continue;
					const rec = post.record as { reply?: { parent?: { uri: string } } };
					const parentUri = rec?.reply?.parent?.uri;
					if (!parentUri || next.has(parentUri)) continue;
					if (didFromUri(parentUri) === post.author.did) parentUris.push(parentUri);
				}
				const toFetch = [...new Set(parentUris)];
				if (toFetch.length === 0) break;
				const parentRes = await agent.api.app.bsky.feed.getPosts({ uris: toFetch });
				for (const post of parentRes.data.posts) next.set(post.uri, post);
				frontier = toFetch;
			}

			// subscribed-post の下方向リプライを getPostThread で取得
			const subscribedUris = newNotifications
				.filter((n) => n.reason === 'subscribed-post' && next.has(n.uri))
				.map((n) => n.uri)
				.slice(0, 10);
			const childrenNext = new Map(replyMap);
			if (subscribedUris.length > 0) {
				await Promise.all(
					subscribedUris.map(async (uri) => {
						try {
							const threadRes = await agent.api.app.bsky.feed.getPostThread({ uri, depth: 5 });
							extractFromThread(threadRes.data.thread, next, childrenNext);
						} catch {}
					})
				);
			}
			replyMap = childrenNext;

			subjectPostMap = next;
			likedUris = nextLiked;
		} catch {
			// 取得失敗は無視
		}
	}

	// 通知投稿から同一著者の連続自己リプライを遡り、テキストを古い順に返す
	function getThreadTexts(notifUri: string): string[] {
		const post = subjectPostMap.get(notifUri);
		if (!post) return [];

		const authorDid = post.author.did;
		const chain: string[] = [notifUri];
		let cur = notifUri;

		for (let i = 0; i < 10; i++) {
			const p = subjectPostMap.get(cur);
			if (!p) break;
			const rec = p.record as { reply?: { parent?: { uri: string } } };
			const parentUri = rec?.reply?.parent?.uri;
			if (!parentUri) break;
			const parent = subjectPostMap.get(parentUri);
			if (!parent || parent.author.did !== authorDid) break;
			chain.unshift(parentUri);
			cur = parentUri;
		}

		// 下方向（同一著者の自己リプライ）を辿る
		const downChain: string[] = [];
		let downCur = notifUri;
		for (let i = 0; i < 10; i++) {
			const children = replyMap.get(downCur) ?? [];
			const sameAuthorChild = children
				.map((u) => subjectPostMap.get(u))
				.find((p) => p?.author.did === authorDid);
			if (!sameAuthorChild) break;
			downChain.push(sameAuthorChild.uri);
			downCur = sameAuthorChild.uri;
		}

		return [...chain, ...downChain]
			.map((u) => (subjectPostMap.get(u)?.record as { text?: string })?.text ?? '')
			.filter(Boolean);
	}

	async function loadMore() {
		if (loading || !hasMore) return;
		loading = true;
		try {
			const data = await listNotifications(cursor);
			notifications = [...notifications, ...data.notifications];
			cursor = data.cursor;
			hasMore = !!data.cursor;
			await fetchSubjectPosts(data.notifications);
		} catch (e) {
			showToast(e instanceof Error ? e.message : '読み込みに失敗しました', 'error');
		} finally {
			loading = false;
		}
	}

	async function handleLike(uri: string, cid: string) {
		try {
			await createLike(uri, cid);
			likedUris = new Set([...likedUris, uri]);
			showToast('いいねしました', 'success');
		} catch (e) {
			showToast(e instanceof Error ? e.message : 'いいねに失敗しました', 'error');
		}
	}

	function handleReply(uri: string, cid: string) {
		goto(`/post?replyTo=${encodeURIComponent(uri)}&replyCid=${encodeURIComponent(cid)}`);
	}

	function handleQuote(uri: string, cid: string) {
		goto(`/post?quoteTo=${encodeURIComponent(uri)}&quoteCid=${encodeURIComponent(cid)}`);
	}

	onMount(async () => {
		const session = getSession();

		// Mark seen on Bluesky
		try {
			await markSeen();
			setUnreadCount(0);
		} catch {
			// ignore
		}

		// Mark seen on Express server
		if (session) {
			fetch(`${PUBLIC_API_URL}/api/notifications/seen`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${session.accessJwt}` }
			}).catch(() => {});
		}

		await loadMore();
		initialLoaded = true;
	});
</script>

<div>
	<header class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
		<h1 class="text-base font-semibold text-gray-900 dark:text-gray-50">Notification</h1>
	</header>

	{#if !initialLoaded}
		<div class="flex justify-center py-12">
			<LoadingSpinner />
		</div>
	{:else if notifications.length === 0}
		<p class="text-center text-sm text-gray-400 dark:text-gray-500 py-12">通知はありません</p>
	{:else}
		{#each notifications as notification (notification.uri)}
			<NotificationItem
				{notification}
				subjectPost={subjectPostMap.get(notification.reasonSubject ?? '')}
				notifPost={subjectPostMap.get(notification.uri)}
				threadTexts={THREAD_REASONS.includes(notification.reason) ? getThreadTexts(notification.uri) : undefined}
				liked={likedUris.has(notification.uri)}
				onLike={handleLike}
				onReply={handleReply}
				onQuote={handleQuote}
			/>
		{/each}
		<InfiniteScroll {loading} {hasMore} onLoadMore={loadMore} />
	{/if}
</div>
