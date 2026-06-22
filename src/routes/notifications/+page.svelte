<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import type { AppBskyNotificationListNotifications, AppBskyFeedDefs, AppBskyActorDefs } from '@atproto/api';
	import NotificationItem from '$lib/components/NotificationItem.svelte';
	import InfiniteScroll from '$lib/components/InfiniteScroll.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
import { setUnreadCount, getNotificationsTapCount, getNotificationsPushCount } from '$lib/stores/notifications.svelte';
	import { showToast } from '$lib/stores/toast.svelte';
	import { getT } from '$lib/stores/language.svelte';
	import { createAgent } from '$lib/api/agent';
	import { listNotifications, markSeen } from '$lib/api/notifications';
	import { createLike } from '$lib/api/posts';

	const t = $derived(getT());

	type Notification = AppBskyNotificationListNotifications.Notification;

	let notifications = $state<Notification[]>([]);
	let cursor = $state<string | undefined>(undefined);
	let loading = $state(false);
	let initialLoaded = $state(false);
	let hasMore = $state(true);
	let subjectPostMap = $state<Map<string, AppBskyFeedDefs.PostView>>(new Map());
	let likedUris = $state<Set<string>>(new Set());
	let replyMap = $state<Map<string, string[]>>(new Map());
	let refreshGen = 0;

	const THREAD_REASONS = ['reply', 'mention', 'quote', 'subscribed-post'];

	type Group = { key: string; reason: string; members: Notification[] };

	// like/repost は対象ポスト単位、follow は対象なしでまとめる。非対象 reason は null（=単独）。
	function groupKey(n: Notification): string | null {
		if (n.reason === 'follow') return 'follow';
		if (['like', 'repost', 'like-via-repost', 'repost-via-repost'].includes(n.reason)) return `${n.reason}::${n.reasonSubject ?? ''}`;
		return null;
	}

	// 時系列順を保ったまま、リスト上で連続する同一キーの通知だけを隣接グループ化する。
	const groups = $derived.by(() => {
		const out: Group[] = [];
		for (const n of notifications) {
			const key = groupKey(n);
			const last = out.at(-1);
			if (key && last && last.key === key) last.members.push(n);
			else out.push({ key: key ?? n.uri, reason: n.reason, members: [n] });
		}
		return out;
	});

	const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	function didFromUri(uri: string): string | undefined {
		return uri.match(/^at:\/\/(did:[^/]+)/)?.[1];
	}

	// 表示すべき元ポストの URI。like-via-repost / repost-via-repost は reasonSubject が
	// リポストレコードを指すため、like/repost レコードの subject.uri（元ポスト）を使う。
	function subjectPostUri(n: Notification): string | undefined {
		if (n.reason === 'like-via-repost' || n.reason === 'repost-via-repost') {
			return (n.record as { subject?: { uri?: string } } | undefined)?.subject?.uri;
		}
		return n.reasonSubject;
	}

	function buildEmbedView(rawEmbed: unknown, authorDid: string): unknown {
		if (!rawEmbed || typeof rawEmbed !== 'object') return undefined;
		const embed = rawEmbed as Record<string, unknown>;
		const type = embed['$type'] as string | undefined;

		if (type === 'app.bsky.embed.images') {
			const images = embed.images as Array<{
				image: { ref: { '$link': string } };
				alt: string;
				aspectRatio?: { width: number; height: number };
			}> | undefined;
			if (!images) return undefined;
			return {
				'$type': 'app.bsky.embed.images#view',
				images: images.map((img) => {
					const cid = img.image.ref['$link'];
					return {
						thumb: `https://cdn.bsky.app/img/feed_thumbnail/plain/${authorDid}/${cid}@jpeg`,
						fullsize: `https://cdn.bsky.app/img/feed_fullsize/plain/${authorDid}/${cid}@jpeg`,
						alt: img.alt,
						aspectRatio: img.aspectRatio
					};
				})
			};
		}

		if (type === 'app.bsky.embed.video') {
			const video = embed.video as { ref: { '$link': string } } | undefined;
			if (!video) return undefined;
			const cid = video.ref['$link'];
			return {
				'$type': 'app.bsky.embed.video#view',
				cid,
				playlist: `https://video.bsky.app/xrpc/app.bsky.video.getPlaylist?did=${authorDid}&cid=${cid}`,
				thumbnail: `https://video.bsky.app/watch/${authorDid}/${cid}/thumbnail.jpg`,
				aspectRatio: embed.aspectRatio
			};
		}

		if (type === 'app.bsky.embed.external') {
			const ext = embed.external as {
				uri: string; title: string; description: string;
				thumb?: { ref: { '$link': string } };
			} | undefined;
			if (!ext) return undefined;
			const thumbCid = ext.thumb?.ref?.['$link'];
			return {
				'$type': 'app.bsky.embed.external#view',
				external: {
					uri: ext.uri,
					title: ext.title,
					description: ext.description,
					thumb: thumbCid
						? `https://cdn.bsky.app/img/feed_thumbnail/plain/${authorDid}/${thumbCid}@jpeg`
						: undefined
				}
			};
		}

		if (type === 'app.bsky.embed.recordWithMedia') {
			const mediaView = buildEmbedView(embed.media, authorDid);
			if (!mediaView) return undefined;
			return {
				'$type': 'app.bsky.embed.recordWithMedia#view',
				media: mediaView,
				record: { record: { '$type': 'app.bsky.embed.record#view$notFound', notFound: true, uri: '' } }
			};
		}

		// app.bsky.embed.record は author 情報が PDS にないためスキップ（AppView 更新後に反映）
		return undefined;
	}

	function buildPostView(
		data: { uri: string; cid?: string; value: unknown },
		author: AppBskyActorDefs.ProfileViewBasic | AppBskyActorDefs.ProfileView
	): AppBskyFeedDefs.PostView {
		const record = data.value as { embed?: unknown; createdAt?: string };
		return {
			uri: data.uri,
			cid: data.cid ?? '',
			author: author as AppBskyActorDefs.ProfileViewBasic,
			record: data.value as AppBskyFeedDefs.PostView['record'],
			embed: buildEmbedView(record.embed, author.did) as AppBskyFeedDefs.PostView['embed'],
			replyCount: 0,
			repostCount: 0,
			likeCount: 0,
			quoteCount: 0,
			indexedAt: record.createdAt ?? new Date().toISOString(),
			labels: [],
		};
	}

	async function getRecordDirect(
		agent: Awaited<ReturnType<typeof createAgent>>,
		uri: string
	): Promise<{ uri: string; cid?: string; value: unknown } | null> {
		const m = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
		if (!m) return null;
		const [, repo, collection, rkey] = m;
		try {
			const res = await agent.com.atproto.repo.getRecord({ repo, collection, rkey });
			return { uri: res.data.uri, cid: res.data.cid, value: res.data.value };
		} catch {
			return null;
		}
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
		// like/repost/quote の subject ポスト（自分の既存投稿）を AppView から取得
		const subjectUris = newNotifications
			.filter((n) => ['like', 'repost', 'like-via-repost', 'repost-via-repost', 'quote', 'reply'].includes(n.reason))
			.map((n) => subjectPostUri(n))
			.filter((uri): uri is string => !!uri && !subjectPostMap.has(uri));

		// reply/mention/quote/subscribed-post の通知投稿本体を PDS から直接取得（AppView遅延を回避）
		const notifUris = newNotifications
			.filter((n) => THREAD_REASONS.includes(n.reason))
			.map((n) => n.uri)
			.filter((uri) => !subjectPostMap.has(uri));

		if (subjectUris.length === 0 && notifUris.length === 0) return;

		try {
			const agent = await createAgent();
			const next = new Map(subjectPostMap);
			const nextLiked = new Set(likedUris);

			// subjectUris は既存投稿なので AppView で取得（いいね数等も取れる）
			if (subjectUris.length > 0) {
				const res = await agent.api.app.bsky.feed.getPosts({ uris: subjectUris });
				for (const post of res.data.posts) {
					next.set(post.uri, post);
					if ((post.viewer as { like?: string } | undefined)?.like) nextLiked.add(post.uri);
				}
			}

			// notifUris は新規投稿なので PDS getRecord で直接取得（遅延なし）
			await Promise.all(
				notifUris.map(async (uri) => {
					const rec = await getRecordDirect(agent, uri);
					if (!rec) return;
					const notif = newNotifications.find((n) => n.uri === uri);
					if (!notif) return;
					next.set(uri, buildPostView(rec, notif.author));
				})
			);

			// notifUris の viewer.like を AppView で確認（他アプリのイイネを反映）
			// AppView のポストは embed（画像・動画等）を含む完全なデータなので next も更新する
			if (notifUris.length > 0) {
				try {
					const appViewRes = await agent.api.app.bsky.feed.getPosts({ uris: notifUris });
					for (const post of appViewRes.data.posts) {
						if ((post.viewer as { like?: string } | undefined)?.like) {
							nextLiked.add(post.uri);
						}
						next.set(post.uri, post);
					}
				} catch {
					// AppView に未伝播の場合は無視
				}
			}

			// 通知投稿の同一著者連続自己リプライを最大3レベルまで遡って PDS から取得
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
				await Promise.all(
					toFetch.map(async (uri) => {
						const rec = await getRecordDirect(agent, uri);
						if (!rec) return;
						// 親ポストの author は frontier の post と同一 DID
						const childPost = frontier.map((u) => next.get(u)).find((p) => {
							const r = p?.record as { reply?: { parent?: { uri: string } } };
							return r?.reply?.parent?.uri === uri;
						});
						if (childPost) next.set(uri, buildPostView(rec, childPost.author));
					})
				);
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

	async function loadMore(): Promise<boolean> {
		if (loading || !hasMore) return false;
		loading = true;
		try {
			const data = await listNotifications(cursor);
			cursor = data.cursor;
			hasMore = !!data.cursor;
			await fetchSubjectPosts(data.notifications);
			notifications = [...notifications, ...data.notifications];
		} catch (e) {
			showToast(e instanceof Error ? e.message : t.notifications.toast.loadFailed, 'error');
		} finally {
			loading = false;
		}
		return true;
	}

	// 先頭ページを取り直してアトミックに差し替える（一覧を空にしないのでフラッシュしない）。
	// retryDelays を渡すと、最新通知が差し替わるまで（= AppView 反映まで）その間隔でリトライする。
	async function refreshFirstPage(retryDelays: number[]): Promise<void> {
		const gen = ++refreshGen;
		const prevNewestUri = notifications[0]?.uri;
		loading = true;
		try {
			for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
				if (gen !== refreshGen) return; // 後続トリガーに置き換えられた
				let data;
				try {
					data = await listNotifications();
				} catch {
					return; // 取得失敗時は既存一覧を維持
				}
				if (gen !== refreshGen) return;

				const freshNewest = data.notifications[0]?.uri;
				const hasNew = !!freshNewest && freshNewest !== prevNewestUri;

				if (hasNew || attempt === retryDelays.length) {
					await fetchSubjectPosts(data.notifications);
					if (gen !== refreshGen) return;
					cursor = data.cursor;
					hasMore = !!data.cursor;
					notifications = data.notifications;
					initialLoaded = true;
					return;
				}
				await delay(retryDelays[attempt]);
			}
		} finally {
			if (gen === refreshGen) loading = false;
		}
	}

	async function handleLike(uri: string, cid: string) {
		try {
			await createLike(uri, cid);
			likedUris = new Set([...likedUris, uri]);
			showToast(t.notifications.toast.liked, 'success');
		} catch (e) {
			showToast(e instanceof Error ? e.message : t.notifications.toast.likeFailed, 'error');
		}
	}

	function handleReply(uri: string, cid: string) {
		goto(`/post?replyTo=${encodeURIComponent(uri)}&replyCid=${encodeURIComponent(cid)}`);
	}

	function handleQuote(uri: string, cid: string) {
		goto(`/post?quoteTo=${encodeURIComponent(uri)}&quoteCid=${encodeURIComponent(cid)}`);
	}

	// 手動タップ（通知タブ）: 即時1回リフレッシュ（リトライ無し）
	$effect(() => {
		const count = getNotificationsTapCount();
		if (count === 0) return;
		untrack(() => {
			markSeen().catch(() => {});
			setUnreadCount(0);
			refreshFirstPage([]);
		});
	});

	// Push 起因: AppView に新着が反映されるまで短い間隔でリトライ
	$effect(() => {
		const count = getNotificationsPushCount();
		if (count === 0) return;
		untrack(() => {
			markSeen().catch(() => {});
			setUnreadCount(0);
			refreshFirstPage([600, 1000, 1500, 2500, 3500]);
		});
	});

	onMount(async () => {
		try {
			await markSeen();
			setUnreadCount(0);
		} catch {
			// ignore
		}

		const ran = await loadMore();
		if (ran) initialLoaded = true;
	});
</script>

<div>
	<header class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
		<h1 class="text-base font-semibold text-gray-900 dark:text-gray-50">{t.notifications.header}</h1>
	</header>

	{#if !initialLoaded}
		<div class="flex justify-center py-12">
			<LoadingSpinner />
		</div>
	{:else if notifications.length === 0}
		<p class="text-center text-sm text-gray-400 dark:text-gray-500 py-12">{t.notifications.empty}</p>
	{:else}
		{#each groups as g (g.members[0].uri)}
			{@const notification = g.members[0]}
			<NotificationItem
				{notification}
				members={g.members}
				subjectPost={subjectPostMap.get(subjectPostUri(notification) ?? '')}
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
