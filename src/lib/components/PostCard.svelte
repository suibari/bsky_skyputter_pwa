<script lang="ts">
	import type { AppBskyFeedDefs } from '@atproto/api';
	import ImageViewer from './ImageViewer.svelte';

	let {
		feedViewPost,
		onDelete,
		onReply,
		onQuote
	}: {
		feedViewPost: AppBskyFeedDefs.FeedViewPost;
		onDelete?: (uri: string) => void;
		onReply?: (uri: string, cid: string) => void;
		onQuote?: (uri: string, cid: string) => void;
	} = $props();

	const post = feedViewPost.post;
	const author = post.author;
	const record = post.record as { text?: string; createdAt?: string };

	function calcTimeAgo(createdAt: string | undefined): string {
		if (!createdAt) return '';
		const diff = Date.now() - new Date(createdAt).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'たった今';
		if (mins < 60) return `${mins}分前`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}時間前`;
		const days = Math.floor(hours / 24);
		return `${days}日前`;
	}

	const timeAgo = $derived(calcTimeAgo(record.createdAt));

	type EmbedImage = { thumb: string; fullsize?: string; aspectRatio?: { width: number; height: number } };

	function getImages(post: AppBskyFeedDefs.PostView): EmbedImage[] {
		const embed = post.embed as { images?: EmbedImage[] } | undefined;
		return embed?.images ?? [];
	}

	let viewerOpen = $state(false);
	let viewerIndex = $state(0);

	function openViewer(index: number) {
		viewerIndex = index;
		viewerOpen = true;
	}
</script>

<article class="px-4 py-3 border-b border-gray-100 flex gap-3">
	<div class="w-10 h-10 rounded-full bg-gray-200 shrink-0 overflow-hidden">
		{#if author.avatar}
			<img src={author.avatar} alt={author.handle} class="w-full h-full object-cover" />
		{/if}
	</div>

	<div class="flex-1 min-w-0">
		<div class="flex items-center justify-between gap-2">
			<div class="min-w-0">
				<span class="font-semibold text-sm text-gray-900 truncate block">
					{author.displayName || author.handle}
				</span>
				<span class="text-xs text-gray-400">@{author.handle} · {timeAgo}</span>
			</div>
		</div>

		{#if record.text}
			<p class="text-sm text-gray-800 mt-1 leading-relaxed whitespace-pre-wrap wrap-break-word">
				{record.text}
			</p>
		{/if}

		{#if getImages(post).length > 0}
			{@const imgs = getImages(post)}
			<div class="mt-2 grid gap-1 {imgs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} rounded-xl overflow-hidden">
				{#each imgs as img, i}
					<button
						class="w-full overflow-hidden focus:outline-none"
						onclick={() => openViewer(i)}
						aria-label="画像を拡大"
					>
						<img
							src={img.thumb}
							alt="添付画像"
							class="w-full object-cover {imgs.length === 1 ? 'max-h-100' : 'aspect-square'}"
							style={imgs.length === 1 && img.aspectRatio
								? `aspect-ratio: ${img.aspectRatio.width} / ${img.aspectRatio.height}`
								: ''}
						/>
					</button>
				{/each}
			</div>
		{/if}

		<div class="flex items-center gap-4 mt-2">
			<!-- いいね数・リポスト数は非表示（アプリコンセプト上不要）
			<div class="flex items-center gap-1 text-gray-400 text-xs">
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
				</svg>
				{post.likeCount ?? 0}
			</div>
			<div class="flex items-center gap-1 text-gray-400 text-xs">
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
				</svg>
				{post.repostCount ?? 0}
			</div>
			-->

			<div class="flex-1"></div>

			{#if onReply}
				<button
					onclick={() => onReply?.(post.uri, post.cid)}
					class="p-1 text-gray-400 hover:text-[#0085ff]"
					aria-label="リプライ"
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
					</svg>
				</button>
			{/if}
			{#if onQuote}
				<button
					onclick={() => onQuote?.(post.uri, post.cid)}
					class="p-1 text-gray-400 hover:text-[#f59e0b]"
					aria-label="引用"
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M3 10.5h5.25v5.25L5.25 19.5H3l2.25-3.75H3V10.5zm7.5 0h5.25v5.25L12.75 19.5H10.5l2.25-3.75H10.5V10.5z" />
					</svg>
				</button>
			{/if}
			{#if onDelete}
				<button
					onclick={() => onDelete?.(post.uri)}
					class="p-1 text-gray-400 hover:text-red-500"
					aria-label="削除"
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
					</svg>
				</button>
			{/if}
		</div>
	</div>
</article>

{#if viewerOpen}
	<ImageViewer
		images={getImages(post).map((img) => img.fullsize ?? img.thumb)}
		startIndex={viewerIndex}
		onClose={() => (viewerOpen = false)}
	/>
{/if}
