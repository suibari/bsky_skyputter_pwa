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

	type Notification = AppBskyNotificationListNotifications.Notification;

	let notifications = $state<Notification[]>([]);
	let cursor = $state<string | undefined>(undefined);
	let loading = $state(false);
	let initialLoaded = $state(false);
	let hasMore = $state(true);
	let subjectPostMap = $state<Map<string, AppBskyFeedDefs.PostView>>(new Map());

	async function fetchSubjectPosts(newNotifications: Notification[]) {
		const uris = newNotifications
			.filter((n) => ['like', 'repost', 'quote'].includes(n.reason) && n.reasonSubject)
			.map((n) => n.reasonSubject as string)
			.filter((uri) => !subjectPostMap.has(uri));

		if (uris.length === 0) return;

		try {
			const agent = await createAgent();
			const res = await agent.api.app.bsky.feed.getPosts({ uris });
			const next = new Map(subjectPostMap);
			for (const post of res.data.posts) {
				next.set(post.uri, post);
			}
			subjectPostMap = next;
		} catch {
			// 取得失敗は無視
		}
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
	<header class="px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
		<h1 class="text-base font-semibold text-gray-900">Notification</h1>
	</header>

	{#if !initialLoaded}
		<div class="flex justify-center py-12">
			<LoadingSpinner />
		</div>
	{:else if notifications.length === 0}
		<p class="text-center text-sm text-gray-400 py-12">通知はありません</p>
	{:else}
		{#each notifications as notification (notification.uri)}
			<NotificationItem
				{notification}
				subjectPost={subjectPostMap.get(notification.reasonSubject ?? '')}
				onReply={handleReply}
				onQuote={handleQuote}
			/>
		{/each}
		<InfiniteScroll {loading} {hasMore} onLoadMore={loadMore} />
	{/if}
</div>
