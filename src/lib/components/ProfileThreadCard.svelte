<script lang="ts">
	import type { AppBskyFeedDefs } from '@atproto/api';
	import { avatarThumbnail } from '$lib/image';
	import { getT } from '$lib/stores/language.svelte';
	import { getSession } from '$lib/stores/auth.svelte';

	const t = $derived(getT());

	let {
		chain,
		parentPost,
		onReply,
		onQuote,
		onDelete
	}: {
		chain: AppBskyFeedDefs.FeedViewPost[];
		parentPost?: AppBskyFeedDefs.PostView;
		onReply?: (uri: string, cid: string) => void;
		onQuote?: (uri: string, cid: string) => void;
		onDelete?: (uri: string) => void;
	} = $props();

	const author = $derived(chain[0].post.author);
	const lastPost = $derived(chain[chain.length - 1].post);
	const threadTexts = $derived(
		chain.map((item) => (item.post.record as { text?: string })?.text ?? '').filter(Boolean)
	);
	const session = $derived(getSession());
	const isOwn = $derived(session?.did === author.did);

	let expanded = $state(false);
	let contentEl = $state<HTMLElement | null>(null);
	let isClamped = $state(false);

	$effect(() => {
		if (!contentEl || expanded) return;
		isClamped = [...contentEl.querySelectorAll('p')].some(
			(p) => p.scrollHeight > p.clientHeight
		);
	});

	function formatTime(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return t.time.justNow;
		if (mins < 60) return t.time.minutesAgo(mins);
		const hours = Math.floor(mins / 60);
		if (hours < 24) return t.time.hoursAgo(hours);
		return t.time.daysAgo(Math.floor(hours / 24));
	}
</script>

<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
	<div class="flex gap-3 items-start">
		<div class="shrink-0">
			<div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
				{#if author.avatar}
					<img
						src={avatarThumbnail(author.avatar)}
						alt={author.handle}
						class="w-full h-full object-cover"
					/>
				{/if}
			</div>
		</div>

		<div class="flex-1 min-w-0">
			<div class="flex items-start justify-between gap-2">
				<p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
					{author.displayName || author.handle}
					<span class="font-normal text-gray-400 dark:text-gray-500">@{author.handle}</span>
				</p>
				<span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">{formatTime(lastPost.indexedAt)}</span>
			</div>

			<div bind:this={contentEl}>
				{#if threadTexts.length === 1}
					<p class="text-sm text-gray-900 dark:text-white mt-0.5 {expanded ? '' : 'line-clamp-3'} whitespace-pre-wrap">{threadTexts[0]}</p>
				{:else}
					<div class="space-y-0.5 mt-0.5">
						{#each threadTexts as text, i}
							<p class="text-sm text-gray-900 dark:text-white {expanded ? '' : 'line-clamp-2'} whitespace-pre-wrap">{text}</p>
							{#if i < threadTexts.length - 1}
								<div class="w-px h-2 bg-gray-300 dark:bg-gray-600 ml-1"></div>
							{/if}
						{/each}
					</div>
				{/if}
			</div>

			{#if isClamped || expanded}
				<button
					class="text-xs text-gray-400 dark:text-gray-500 mt-0.5"
					onclick={() => (expanded = !expanded)}
					aria-label={expanded ? t.notificationItem.ariaCollapse : t.notificationItem.ariaExpand}
				>
					{expanded ? '▲' : '▼'}
				</button>
			{/if}

			{#if parentPost}
				{@const parentRec = parentPost.record as { text?: string } | undefined}
				<div class="mt-2 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
					<div class="flex items-center gap-1.5 mb-1">
						{#if parentPost.author.avatar}
							<img src={avatarThumbnail(parentPost.author.avatar)} alt={parentPost.author.handle} class="w-4 h-4 rounded-full object-cover shrink-0" />
						{/if}
						<span class="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
							{parentPost.author.displayName || parentPost.author.handle}
						</span>
						<span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">@{parentPost.author.handle}</span>
					</div>
					{#if parentRec?.text}
						<p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 whitespace-pre-wrap">{parentRec.text}</p>
					{/if}
				</div>
			{/if}

			<div class="flex items-center justify-end gap-2 mt-1.5">
				{#if onReply}
					<button
						onclick={() => onReply?.(lastPost.uri, lastPost.cid)}
						class="p-1 text-gray-400 hover:text-[#0085ff]"
						aria-label={t.notificationItem.ariaReply}
					>
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
						</svg>
					</button>
				{/if}
				{#if onQuote}
					<button
						onclick={() => onQuote?.(lastPost.uri, lastPost.cid)}
						class="p-1 text-gray-400 hover:text-[#f59e0b]"
						aria-label={t.notificationItem.ariaQuote}
					>
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M3 10.5h5.25v5.25L5.25 19.5H3l2.25-3.75H3V10.5zm7.5 0h5.25v5.25L12.75 19.5H10.5l2.25-3.75H10.5V10.5z" />
						</svg>
					</button>
				{/if}
				{#if isOwn && onDelete}
					<button
						onclick={() => onDelete?.(lastPost.uri)}
						class="p-1 text-gray-400 hover:text-red-500"
						aria-label={t.postCard.ariaDelete}
					>
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
						</svg>
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
