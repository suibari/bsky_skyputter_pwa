<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { AppBskyActorDefs, AppBskyFeedDefs } from '@atproto/api';
	import PostCard from '$lib/components/PostCard.svelte';
	import InfiniteScroll from '$lib/components/InfiniteScroll.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { getSession } from '$lib/stores/auth.svelte';
	import { showToast } from '$lib/stores/toast.svelte';
	import { createAgent } from '$lib/api/agent';
	import { getAuthorFeed, deletePost } from '$lib/api/posts';

	let posts = $state<AppBskyFeedDefs.FeedViewPost[]>([]);
	let cursor = $state<string | undefined>(undefined);
	let loading = $state(false);
	let hasMore = $state(true);
	let deleteTarget = $state<string | null>(null);
	let profile = $state<AppBskyActorDefs.ProfileViewDetailed | null>(null);

	async function loadProfile() {
		const session = getSession();
		if (!session) return;
		try {
			const agent = await createAgent();
			const res = await agent.getProfile({ actor: session.did });
			profile = res.data;
		} catch {
			// プロフィール取得失敗は無視してフィードのみ表示
		}
	}

	async function loadMore() {
		if (loading || !hasMore) return;
		const session = getSession();
		if (!session) return;

		loading = true;
		try {
			const data = await getAuthorFeed(session.did, cursor);
			const nonReposts = data.feed.filter(
				(f) => !(f.reason as { $type?: string } | undefined)?.$type?.includes('Repost')
			);
			posts = [...posts, ...nonReposts];
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

	function handleQuote(uri: string, cid: string) {
		goto(`/post?quoteTo=${encodeURIComponent(uri)}&quoteCid=${encodeURIComponent(cid)}`);
	}

	onMount(() => {
		loadProfile();
		loadMore();
	});
</script>

<div>
	<header class="px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
		<h1 class="text-base font-semibold text-gray-900">プロフィール</h1>
	</header>

	<!-- プロフィールカード -->
	<div class="px-4 py-4 border-b border-gray-100">
		{#if profile}
			<div class="flex items-center gap-3">
				<div class="w-16 h-16 rounded-full bg-gray-200 overflow-hidden shrink-0">
					<img
						src={profile.avatar}
						alt="アバター"
						class="w-full h-full object-cover"
						onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
					/>
				</div>
				<div class="min-w-0">
					<p class="font-bold text-gray-900 truncate">{profile.displayName ?? profile.handle}</p>
					<p class="text-sm text-gray-400">@{profile.handle}</p>
				</div>
			</div>
			{#if profile.description}
				<p class="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{profile.description}</p>
			{/if}
			<div class="flex gap-4 mt-3 text-sm text-gray-500">
				<span><b class="text-gray-900">{profile.followsCount ?? 0}</b> フォロー</span>
				<span><b class="text-gray-900">{profile.followersCount ?? 0}</b> フォロワー</span>
				<span><b class="text-gray-900">{profile.postsCount ?? 0}</b> 投稿</span>
			</div>
		{:else}
			<div class="flex items-center gap-3">
				<div class="w-16 h-16 rounded-full bg-gray-100 animate-pulse shrink-0"></div>
				<div class="space-y-2">
					<div class="h-4 w-28 bg-gray-100 rounded animate-pulse"></div>
					<div class="h-3 w-20 bg-gray-100 rounded animate-pulse"></div>
				</div>
			</div>
		{/if}
	</div>

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
				onQuote={handleQuote}
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
