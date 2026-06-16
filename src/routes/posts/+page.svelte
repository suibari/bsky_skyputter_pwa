<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { AppBskyFeedDefs } from '@atproto/api';
	import PostCard from '$lib/components/PostCard.svelte';
	import InfiniteScroll from '$lib/components/InfiniteScroll.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { getSession } from '$lib/stores/auth.svelte';
	import { showToast } from '$lib/stores/toast.svelte';
	import { getAuthorFeed, deletePost } from '$lib/api/posts';

	let posts = $state<AppBskyFeedDefs.FeedViewPost[]>([]);
	let cursor = $state<string | undefined>(undefined);
	let loading = $state(false);
	let hasMore = $state(true);
	let deleteTarget = $state<string | null>(null);

	async function loadMore() {
		if (loading || !hasMore) return;
		const session = getSession();
		if (!session) return;

		loading = true;
		try {
			const data = await getAuthorFeed(session.did, cursor);
			posts = [...posts, ...data.feed];
			cursor = data.cursor;
			hasMore = !!data.cursor;
		} catch (e) {
			showToast(e instanceof Error ? e.message : '読み込みに失敗しました', 'error');
		} finally {
			loading = false;
		}
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		try {
			await deletePost(deleteTarget);
			posts = posts.filter((p) => p.post.uri !== deleteTarget);
			showToast('削除しました', 'success');
		} catch {
			showToast('削除に失敗しました', 'error');
		} finally {
			deleteTarget = null;
		}
	}

	function handleReply(uri: string, cid: string) {
		goto(`/post?replyTo=${encodeURIComponent(uri)}&replyCid=${encodeURIComponent(cid)}`);
	}

	onMount(() => loadMore());
</script>

<div>
	<header class="px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
		<h1 class="text-base font-semibold text-gray-900">Your Posts</h1>
	</header>

	{#if posts.length === 0 && loading}
		<div class="flex justify-center py-12">
			<LoadingSpinner />
		</div>
	{:else if posts.length === 0 && !loading}
		<p class="text-center text-sm text-gray-400 py-12">まだ投稿がありません</p>
	{:else}
		{#each posts as feedViewPost (feedViewPost.post.uri)}
			<PostCard
				{feedViewPost}
				onDelete={(uri) => (deleteTarget = uri)}
				onReply={handleReply}
			/>
		{/each}
		<InfiniteScroll {loading} {hasMore} onLoadMore={loadMore} />
	{/if}
</div>

<Modal
	open={!!deleteTarget}
	title="投稿を削除"
	message="この投稿を削除しますか？この操作は取り消せません。"
	onConfirm={confirmDelete}
	onCancel={() => (deleteTarget = null)}
/>
