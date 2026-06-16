<script lang="ts">
	import { onMount } from 'svelte';
	import type { AppBskyNotificationListNotifications } from '@atproto/api';
	import NotificationItem from '$lib/components/NotificationItem.svelte';
	import InfiniteScroll from '$lib/components/InfiniteScroll.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { getSession } from '$lib/stores/auth.svelte';
	import { setUnreadCount } from '$lib/stores/notifications.svelte';
	import { showToast } from '$lib/stores/toast.svelte';
	import { listNotifications, markSeen } from '$lib/api/notifications';

	type Notification = AppBskyNotificationListNotifications.Notification;

	let notifications = $state<Notification[]>([]);
	let cursor = $state<string | undefined>(undefined);
	let loading = $state(false);
	let hasMore = $state(true);

	async function loadMore() {
		if (loading || !hasMore) return;
		loading = true;
		try {
			const data = await listNotifications(cursor);
			notifications = [...notifications, ...data.notifications];
			cursor = data.cursor;
			hasMore = !!data.cursor;
		} catch (e) {
			showToast(e instanceof Error ? e.message : '読み込みに失敗しました', 'error');
		} finally {
			loading = false;
		}
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
	});
</script>

<div>
	<header class="px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
		<h1 class="text-base font-semibold text-gray-900">Notification</h1>
	</header>

	{#if notifications.length === 0 && loading}
		<div class="flex justify-center py-12">
			<LoadingSpinner />
		</div>
	{:else if notifications.length === 0 && !loading}
		<p class="text-center text-sm text-gray-400 py-12">通知はありません</p>
	{:else}
		{#each notifications as notification (notification.uri)}
			<NotificationItem {notification} />
		{/each}
		<InfiniteScroll {loading} {hasMore} onLoadMore={loadMore} />
	{/if}
</div>
