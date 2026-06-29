<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { AppBskyActorDefs, AppBskyFeedDefs } from '@atproto/api';
	import { avatarThumbnail } from '$lib/image';
	import PostCard from '$lib/components/PostCard.svelte';
	import InfiniteScroll from '$lib/components/InfiniteScroll.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { getSession } from '$lib/stores/auth.svelte';
	import { showToast } from '$lib/stores/toast.svelte';
	import { getT } from '$lib/stores/language.svelte';
	import { createAgent } from '$lib/api/agent';

	const t = $derived(getT());
	import { getAuthorFeedWithReplies, deletePost, searchPostsByHashtag } from '$lib/api/posts';
	import { parseTextSegments } from '$lib/richtext';
	import ProfileThreadCard from '$lib/components/ProfileThreadCard.svelte';

	const descSegments = $derived(profile?.description ? parseTextSegments(profile.description) : []);

	function isRepostItem(f: AppBskyFeedDefs.FeedViewPost): boolean {
		return !!(f.reason as { $type?: string } | undefined)?.$type?.includes('Repost');
	}
	function feedItemKey(f: AppBskyFeedDefs.FeedViewPost): string {
		return isRepostItem(f) ? `repost:${f.post.uri}` : f.post.uri;
	}

	type DisplayItem =
		| { type: 'post'; item: AppBskyFeedDefs.FeedViewPost; parentPost?: AppBskyFeedDefs.PostView }
		| { type: 'thread'; chain: AppBskyFeedDefs.FeedViewPost[]; parentPost?: AppBskyFeedDefs.PostView };

	function getOtherAuthorParent(item: AppBskyFeedDefs.FeedViewPost): AppBskyFeedDefs.PostView | undefined {
		const parent = item.reply?.parent;
		if (!parent || !('author' in parent)) return undefined;
		const pv = parent as AppBskyFeedDefs.PostView;
		if (pv.author.did === item.post.author.did) return undefined;
		return pv;
	}

	function groupFeedItems(feedItems: AppBskyFeedDefs.FeedViewPost[]): DisplayItem[] {
		const uriToItem = new Map<string, AppBskyFeedDefs.FeedViewPost>();
		for (const item of feedItems) uriToItem.set(item.post.uri, item);

		const childMap = new Map<string, AppBskyFeedDefs.FeedViewPost>();
		const childUris = new Set<string>();

		for (const item of feedItems) {
			const rec = item.post.record as { reply?: { parent?: { uri: string } } };
			const parentUri = rec.reply?.parent?.uri;
			if (!parentUri) continue;
			const parentItem = uriToItem.get(parentUri);
			if (parentItem && parentItem.post.author.did === item.post.author.did) {
				childMap.set(parentUri, item);
				childUris.add(item.post.uri);
			}
		}

		const result: DisplayItem[] = [];
		for (const item of feedItems) {
			if (childUris.has(item.post.uri)) continue;
			if (childMap.has(item.post.uri)) {
				const chain: AppBskyFeedDefs.FeedViewPost[] = [item];
				let cur = item;
				while (childMap.has(cur.post.uri)) {
					const child = childMap.get(cur.post.uri)!;
					chain.push(child);
					cur = child;
				}
				result.push({ type: 'thread', chain, parentPost: getOtherAuthorParent(chain[0]) });
			} else {
				result.push({ type: 'post', item, parentPost: getOtherAuthorParent(item) });
			}
		}
		return result;
	}

	let posts = $state<AppBskyFeedDefs.FeedViewPost[]>([]);
	const displayItems = $derived.by(() => groupFeedItems(posts));
	let cursor = $state<string | undefined>(undefined);
	let loading = $state(false);
	let initialLoaded = $state(false);
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
			const data = await getAuthorFeedWithReplies(session.did, cursor);
			posts = [...posts, ...data.feed];
			cursor = data.cursor;
			hasMore = !!data.cursor;
		} catch (e) {
			showToast(e instanceof Error ? e.message : t.profile.toast.loadFailed, 'error');
		} finally {
			loading = false;
			initialLoaded = true;
		}
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		try {
			await deletePost(deleteTarget);
			posts = posts.filter((p) => p.post.uri !== deleteTarget);
			showToast(t.profile.toast.deleted, 'success');
		} catch {
			showToast(t.profile.toast.deleteFailed, 'error');
		} finally {
			deleteTarget = null;
		}
	}

	let hashtagSearchTag = $state<string | null>(null);
	let hashtagSearchPosts = $state<AppBskyFeedDefs.PostView[]>([]);
	let hashtagSearchLoading = $state(false);
	let hashtagSearchCursor = $state<string | undefined>(undefined);
	let hashtagSearchHasMore = $state(true);

	async function handleHashtag(tag: string) {
		if (!profile) return;
		hashtagSearchTag = tag;
		hashtagSearchPosts = [];
		hashtagSearchCursor = undefined;
		hashtagSearchHasMore = true;
		await loadHashtagSearch();
	}

	async function loadHashtagSearch() {
		if (hashtagSearchLoading || !hashtagSearchTag || !profile) return;
		hashtagSearchLoading = true;
		try {
			const data = await searchPostsByHashtag(hashtagSearchTag, profile.handle, hashtagSearchCursor);
			hashtagSearchPosts = [...hashtagSearchPosts, ...data.posts];
			hashtagSearchCursor = data.cursor;
			hashtagSearchHasMore = !!data.cursor;
		} catch (e) {
			showToast(e instanceof Error ? e.message : t.profile.hashtagSearch.loadFailed, 'error');
		} finally {
			hashtagSearchLoading = false;
		}
	}

	function closeHashtagSearch() {
		hashtagSearchTag = null;
		hashtagSearchPosts = [];
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
	<header class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
		<h1 class="text-base font-semibold text-gray-900 dark:text-gray-50">{t.profile.header}</h1>
	</header>

	<!-- プロフィールカード -->
	<div class="px-4 py-4 border-b border-gray-100 dark:border-gray-800">
		{#if profile}
			<div class="flex items-center gap-3">
				<div class="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
					<img
						src={avatarThumbnail(profile.avatar)}
						alt={t.profile.ariaAvatar}
						class="w-full h-full object-cover"
						onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
					/>
				</div>
				<div class="min-w-0">
					<p class="font-bold text-gray-900 dark:text-gray-50 truncate">{profile.displayName ?? profile.handle}</p>
					<p class="text-sm text-gray-400 dark:text-gray-500">@{profile.handle}</p>
				</div>
			</div>
			{#if profile.description}
				<p class="text-sm text-gray-700 dark:text-gray-300 mt-3 whitespace-pre-wrap">
					{#each descSegments as seg}
						{#if seg.type === 'link'}
							<a href={seg.url} target="_blank" rel="noopener noreferrer"
								class="text-[#0085ff] hover:underline break-all">{seg.text}</a>
						{:else}
							{seg.text}
						{/if}
					{/each}
				</p>
			{/if}
			<div class="flex gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
				<span><b class="text-gray-900 dark:text-gray-50">{profile.followsCount ?? 0}</b> {t.profile.follows}</span>
				<span><b class="text-gray-900 dark:text-gray-50">{profile.followersCount ?? 0}</b> {t.profile.followers}</span>
				<span><b class="text-gray-900 dark:text-gray-50">{profile.postsCount ?? 0}</b> {t.profile.posts}</span>
			</div>
		{:else}
			<div class="flex items-center gap-3">
				<div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse shrink-0"></div>
				<div class="space-y-2">
					<div class="h-4 w-28 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
					<div class="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
				</div>
			</div>
		{/if}
	</div>

	{#if !initialLoaded}
		<div class="flex justify-center py-12">
			<LoadingSpinner />
		</div>
	{:else if posts.length === 0}
		<p class="text-center text-sm text-gray-400 dark:text-gray-500 py-12">{t.profile.empty}</p>
	{:else}
		{#each displayItems as ditem (ditem.type === 'thread' ? ditem.chain[0].post.uri : feedItemKey(ditem.item))}
			{#if ditem.type === 'thread'}
				<ProfileThreadCard
					chain={ditem.chain}
					parentPost={ditem.parentPost}
					onDelete={(uri) => (deleteTarget = uri)}
					onReply={handleReply}
					onQuote={handleQuote}
				/>
			{:else}
				<PostCard
					feedViewPost={ditem.item}
					parentPost={ditem.parentPost}
					onDelete={isRepostItem(ditem.item) ? undefined : (uri) => (deleteTarget = uri)}
					onReply={handleReply}
					onQuote={handleQuote}
					onHashtag={handleHashtag}
				/>
			{/if}
		{/each}
		<InfiniteScroll {loading} {hasMore} onLoadMore={loadMore} />
	{/if}
</div>

<Modal
	open={!!deleteTarget}
	title={t.profile.modal.title}
	message={t.profile.modal.message}
	confirmLabel={t.common.delete}
	onConfirm={confirmDelete}
	onCancel={() => (deleteTarget = null)}
/>

{#if hashtagSearchTag}
	<div class="fixed inset-0 z-30 flex justify-center">
		<div class="w-full max-w-md flex flex-col bg-white dark:bg-gray-900">
			<header class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3 bg-white dark:bg-gray-900">
				<button
					onclick={closeHashtagSearch}
					class="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
					aria-label={t.common.close}
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<h2 class="text-base font-semibold text-gray-900 dark:text-gray-50">
					{t.profile.hashtagSearch.title(hashtagSearchTag)}
				</h2>
			</header>
			<div class="flex-1 overflow-y-auto scrollbar-none pb-16">
				{#if hashtagSearchLoading && hashtagSearchPosts.length === 0}
					<div class="flex justify-center py-12"><LoadingSpinner /></div>
				{:else if hashtagSearchPosts.length === 0}
					<p class="text-center text-sm text-gray-400 dark:text-gray-500 py-12">
						{t.profile.hashtagSearch.empty}
					</p>
				{:else}
					{#each hashtagSearchPosts as post (post.uri)}
						<PostCard feedViewPost={{ post }} />
					{/each}
					<InfiniteScroll loading={hashtagSearchLoading} hasMore={hashtagSearchHasMore} onLoadMore={loadHashtagSearch} />
				{/if}
			</div>
		</div>
	</div>
{/if}
