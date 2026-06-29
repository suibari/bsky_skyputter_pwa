<script lang="ts">
	import type { AppBskyNotificationListNotifications, AppBskyFeedDefs } from '@atproto/api';
	import ImageViewer from './ImageViewer.svelte';
	import VideoViewer from './VideoViewer.svelte';
	import { avatarThumbnail } from '$lib/image';
	import { getT } from '$lib/stores/language.svelte';
	import { parseTextSegments } from '$lib/richtext';

	const t = $derived(getT());

	type Notification = AppBskyNotificationListNotifications.Notification;
	type EmbedImage = { thumb: string; fullsize?: string; aspectRatio?: { width: number; height: number } };
	type EmbedVideo = { playlist: string; thumbnail?: string; aspectRatio?: { width: number; height: number } };
	type ExternalView = { uri: string; title: string; description: string; thumb?: string };
	type QuotedRecord = { author: { handle: string; displayName?: string; avatar?: string }; text?: string };
	type ViewRecord = { $type?: string; author?: QuotedRecord['author']; value?: { text?: string } };
	type RawEmbed = {
		$type?: string;
		images?: EmbedImage[];
		playlist?: string; thumbnail?: string; aspectRatio?: { width: number; height: number };
		external?: ExternalView;
		record?: ViewRecord;
		media?: { $type?: string; images?: EmbedImage[]; playlist?: string; thumbnail?: string; aspectRatio?: { width: number; height: number }; external?: ExternalView };
	};

	let {
		notification,
		members,
		subjectPost,
		notifPost,
		threadTexts,
		liked = false,
		onLike,
		onReply,
		onQuote
	}: {
		notification: Notification;
		members?: Notification[];
		subjectPost?: AppBskyFeedDefs.PostView;
		notifPost?: AppBskyFeedDefs.PostView;
		threadTexts?: string[];
		liked?: boolean;
		onLike?: (uri: string, cid: string) => void;
		onReply?: (uri: string, cid: string) => void;
		onQuote?: (uri: string, cid: string) => void;
	} = $props();

	// グループの構成通知（未指定なら単独）。先頭が最新＝代表 notification。
	const groupMembers = $derived(members ?? [notification]);
	const isGroup = $derived(groupMembers.length > 1);
	const anyUnread = $derived(groupMembers.some((m) => !m.isRead));
	// スタックアバターは表示件数を抑え、残りは人数でカバーする
	const AVATAR_LIMIT = 12;
	const avatarMembers = $derived(groupMembers.slice(0, AVATAR_LIMIT));

	const reasonIcons: Record<string, { color: string; icon: string }> = {
		like: { color: '#ef4444', icon: 'heart' },
		'like-via-repost': { color: '#ef4444', icon: 'heart' },
		repost: { color: '#22c55e', icon: 'repost' },
		'repost-via-repost': { color: '#22c55e', icon: 'repost' },
		follow: { color: '#0085ff', icon: 'follow' },
		mention: { color: '#8b5cf6', icon: 'at' },
		reply: { color: '#0085ff', icon: 'reply' },
		quote: { color: '#f59e0b', icon: 'quote' },
		'subscribed-post': { color: '#8b5cf6', icon: 'post' }
	};

	const reasonLabels = $derived<Record<string, string>>({
		like: t.notificationItem.reasons.like,
		'like-via-repost': t.notificationItem.reasons.likeViaRepost,
		repost: t.notificationItem.reasons.repost,
		'repost-via-repost': t.notificationItem.reasons.repostViaRepost,
		follow: t.notificationItem.reasons.follow,
		mention: t.notificationItem.reasons.mention,
		reply: t.notificationItem.reasons.reply,
		quote: t.notificationItem.reasons.quote,
		'subscribed-post': t.notificationItem.reasons.subscribedPost
	});

	const label = $derived(reasonLabels[notification.reason] ?? notification.reason);
	const iconInfo = $derived(reasonIcons[notification.reason] ?? { color: '#6b7280', icon: 'bell' });
	const record = $derived(notification.record as { text?: string } | undefined);
	const canInteract = $derived(['reply', 'mention', 'quote', 'subscribed-post'].includes(notification.reason));
	const isHighlightText = $derived(['reply', 'mention', 'quote'].includes(notification.reason));
	const textClass = $derived(
		isHighlightText
			? 'text-gray-900 dark:text-white font-medium text-sm leading-relaxed'
			: 'text-gray-500 dark:text-gray-400 text-xs'
	);
	const subjectRecord = $derived(subjectPost?.record as { text?: string } | undefined);
	// threadTexts がある場合はそちらを優先、ない場合は like/repost の subject テキスト
	const displayText = $derived(
		threadTexts && threadTexts.length > 0 ? null : (record?.text ?? subjectRecord?.text)
	);

	// 画像・動画表示対象: THREAD_REASONS は通知投稿本体、それ以外は subject 投稿
	const imagePost = $derived(canInteract ? notifPost : subjectPost);

	function getImages(post: AppBskyFeedDefs.PostView | undefined): EmbedImage[] {
		const embed = post?.embed as RawEmbed | undefined;
		return embed?.images ?? embed?.media?.images ?? [];
	}

	function getVideo(post: AppBskyFeedDefs.PostView | undefined): EmbedVideo | null {
		const embed = post?.embed as RawEmbed | undefined;
		const src = embed?.$type === 'app.bsky.embed.video#view' ? embed
			: embed?.media?.$type === 'app.bsky.embed.video#view' ? embed.media
			: null;
		if (src?.playlist) return { playlist: src.playlist, thumbnail: src.thumbnail, aspectRatio: src.aspectRatio };
		return null;
	}

	function getExternal(post: AppBskyFeedDefs.PostView | undefined): ExternalView | null {
		const embed = post?.embed as RawEmbed | undefined;
		if (embed?.$type === 'app.bsky.embed.external#view') return embed.external ?? null;
		if (embed?.media?.$type === 'app.bsky.embed.external#view') return embed.media.external ?? null;
		return null;
	}

	function getQuotedRecord(post: AppBskyFeedDefs.PostView | undefined): QuotedRecord | null {
		const embed = post?.embed as RawEmbed | undefined;
		const inner: ViewRecord | undefined =
			embed?.$type === 'app.bsky.embed.record#view'
				? embed.record
				: embed?.$type === 'app.bsky.embed.recordWithMedia#view'
				? (embed.record as unknown as { record?: ViewRecord } | undefined)?.record
				: undefined;
		if (!inner?.author) return null;
		return { author: inner.author, text: inner.value?.text };
	}

	function hostname(uri: string): string {
		try { return new URL(uri).hostname; } catch { return uri; }
	}

	let expanded = $state(false);
	let contentEl = $state<HTMLElement | null>(null);
	let isClamped = $state(false);

	$effect(() => {
		if (!contentEl || expanded) return;
		isClamped = [...contentEl.querySelectorAll('p')].some(
			(p) => p.scrollHeight > p.clientHeight
		);
	});

	let viewerOpen = $state(false);
	let viewerIndex = $state(0);
	let videoViewerOpen = $state(false);

	function openViewer(index: number) {
		viewerIndex = index;
		viewerOpen = true;
	}

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

{#snippet reasonIcon(cls: string)}
	{#if iconInfo.icon === 'heart'}
		<svg class={cls} viewBox="0 0 20 20" fill="currentColor">
			<path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-2.184C4.032 12.416 2.5 10.272 2.5 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118.5 7.5c0 2.772-1.532 4.916-3.385 6.536a22.049 22.049 0 01-2.582 2.184 21.002 21.002 0 01-1.162.682l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
		</svg>
	{:else if iconInfo.icon === 'repost'}
		<svg class={cls} viewBox="0 0 20 20" fill="currentColor">
			<path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H5.498a.75.75 0 00-.75.75v3.498a.75.75 0 001.5 0v-1.732l.31.311a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V3.198a.75.75 0 00-1.5 0v1.544l-.311-.31a7 7 0 00-11.712 3.138.75.75 0 101.449.39A5.502 5.502 0 0114.5 3.74l.31.31h-2.433a.75.75 0 000 1.5h3.498a.75.75 0 00.53-.219z" clip-rule="evenodd" />
		</svg>
	{:else if iconInfo.icon === 'follow'}
		<svg class={cls} viewBox="0 0 20 20" fill="currentColor">
			<path d="M11 5a3 3 0 11-6 0 3 3 0 016 0zM2.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 018 18a9.953 9.953 0 01-5.385-1.572zM16.25 5.75a.75.75 0 00-1.5 0v2h-2a.75.75 0 000 1.5h2v2a.75.75 0 001.5 0v-2h2a.75.75 0 000-1.5h-2v-2z" />
		</svg>
	{:else if iconInfo.icon === 'post'}
		<svg class={cls} viewBox="0 0 20 20" fill="currentColor">
			<path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5zm7 1a1 1 0 10-2 0v1H6a1 1 0 100 2h1v1a1 1 0 102 0V9h1a1 1 0 100-2H9V6zm4 0a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-1v3l-3-3h-1V8h.5A2.5 2.5 0 0013 5.5V6z" />
		</svg>
	{:else}
		<svg class={cls} viewBox="0 0 20 20" fill="currentColor">
			<path fill-rule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 001.28.53l3.658-3.658A17.569 17.569 0 0015 14c2.236 0 4.43-.18 6.57-.524C23.007 13.245 24 11.986 24 10.574V5.426c0-1.413-.993-2.67-2.43-2.902A41.402 41.402 0 0015 2H10z" clip-rule="evenodd" />
		</svg>
	{/if}
{/snippet}

<!-- テキスト先頭に表示する reason アイコン（グループ/非グループ共通） -->
{#snippet reasonMark()}
	<span class="shrink-0 mt-0.5" style="color: {iconInfo.color}">{@render reasonIcon('w-4 h-4')}</span>
{/snippet}

{#snippet contentBody()}
	{#if threadTexts && threadTexts.length > 0}
			<div bind:this={contentEl} class="mt-0.5">
				{#if threadTexts.length === 1}
					<p class="{textClass} {expanded ? '' : 'line-clamp-3'}">
						{#each parseTextSegments(threadTexts[0]) as seg}
							{#if seg.type === 'link'}
								<a href={seg.url} target="_blank" rel="noopener noreferrer"
									class="text-[#0085ff] hover:underline break-all">{seg.text}</a>
							{:else}
								{seg.text}
							{/if}
						{/each}
					</p>
				{:else}
					<div class="space-y-0.5">
						{#each threadTexts as text, i}
							<p class="{textClass} {expanded ? '' : 'line-clamp-2'}">
								{#each parseTextSegments(text) as seg}
									{#if seg.type === 'link'}
										<a href={seg.url} target="_blank" rel="noopener noreferrer"
											class="text-[#0085ff] hover:underline break-all">{seg.text}</a>
									{:else}
										{seg.text}
									{/if}
								{/each}
							</p>
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
		{:else if displayText}
			<div bind:this={contentEl}>
				<p class="{textClass} mt-0.5 {expanded ? '' : 'line-clamp-2'}">
					{#each parseTextSegments(displayText) as seg}
						{#if seg.type === 'link'}
							<a href={seg.url} target="_blank" rel="noopener noreferrer"
								class="text-[#0085ff] hover:underline break-all">{seg.text}</a>
						{:else}
							{seg.text}
						{/if}
					{/each}
				</p>
			</div>
			{#if isClamped || expanded}
				<button
					class="text-xs text-gray-400 dark:text-gray-500"
					onclick={() => (expanded = !expanded)}
					aria-label={expanded ? t.notificationItem.ariaCollapse : t.notificationItem.ariaExpand}
				>
					{expanded ? '▲' : '▼'}
				</button>
			{/if}
		{/if}

		{#if getImages(imagePost).length > 0}
			{@const imgs = getImages(imagePost)}
			<div class="mt-2 grid gap-1 {imgs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} rounded-xl overflow-hidden">
				{#each imgs as img, i}
					<button
						class="w-full overflow-hidden focus:outline-none"
						onclick={() => openViewer(i)}
						aria-label={t.notificationItem.ariaZoomImage}
					>
						<img
							src={img.thumb}
							alt={t.notificationItem.altAttachedImage}
							class="w-full object-cover {imgs.length === 1 ? 'max-h-60' : 'aspect-square'}"
							style={imgs.length === 1 && img.aspectRatio
								? `aspect-ratio: ${img.aspectRatio.width} / ${img.aspectRatio.height}`
								: ''}
						/>
					</button>
				{/each}
			</div>
		{/if}

		{#if getVideo(imagePost)}
			{@const vid = getVideo(imagePost)!}
			<button
				class="relative mt-2 w-full rounded-xl overflow-hidden bg-black focus:outline-none"
				style={vid.aspectRatio ? `aspect-ratio: ${vid.aspectRatio.width} / ${vid.aspectRatio.height}` : 'aspect-ratio: 16 / 9'}
				onclick={() => (videoViewerOpen = true)}
				aria-label={t.notificationItem.ariaPlayVideo}
			>
				{#if vid.thumbnail}
					<img src={vid.thumbnail} alt={t.notificationItem.altVideoThumbnail} class="w-full h-full object-cover" />
				{/if}
				<div class="absolute inset-0 flex items-center justify-center">
					<div class="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
						<svg class="w-5 h-5 text-white translate-x-0.5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z" />
						</svg>
					</div>
				</div>
			</button>
		{/if}

		{#if getExternal(imagePost)}
			{@const ext = getExternal(imagePost)!}
			<a
				href={ext.uri}
				target="_blank"
				rel="noopener noreferrer"
				class="block mt-2 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
			>
				{#if ext.thumb}
					<img src={ext.thumb} alt={ext.title} class="w-full max-h-32 object-cover" />
				{/if}
				<div class="px-3 py-2">
					<p class="text-xs text-gray-400 truncate">{hostname(ext.uri)}</p>
					<p class="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">{ext.title}</p>
					{#if ext.description}
						<p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{ext.description}</p>
					{/if}
				</div>
			</a>
		{/if}

		{#if getQuotedRecord(imagePost)}
			{@const quoted = getQuotedRecord(imagePost)!}
			<div class="mt-2 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
				<div class="flex items-center gap-1.5 mb-1">
					{#if quoted.author.avatar}
						<img src={avatarThumbnail(quoted.author.avatar)} alt={quoted.author.handle} class="w-4 h-4 rounded-full object-cover shrink-0" />
					{/if}
					<span class="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
						{quoted.author.displayName || quoted.author.handle}
					</span>
					<span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">@{quoted.author.handle}</span>
				</div>
				{#if quoted.text}
					<p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 whitespace-pre-wrap">{quoted.text}</p>
				{/if}
			</div>
		{/if}

		{#if notification.reason === 'reply' && subjectPost}
			{@const subjectRec = subjectPost.record as { text?: string } | undefined}
			<div class="mt-2 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
				<div class="flex items-center gap-1.5 mb-1">
					{#if subjectPost.author.avatar}
						<img src={avatarThumbnail(subjectPost.author.avatar)} alt={subjectPost.author.handle} class="w-4 h-4 rounded-full object-cover shrink-0" />
					{/if}
					<span class="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">
						{subjectPost.author.displayName || subjectPost.author.handle}
					</span>
					<span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">@{subjectPost.author.handle}</span>
				</div>
				{#if subjectRec?.text}
					<p class="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 whitespace-pre-wrap">{subjectRec.text}</p>
				{/if}
			</div>
		{/if}
{/snippet}

<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
	{#if isGroup}
		<div class="flex items-start justify-between gap-2">
			<div class="flex flex-wrap items-center gap-1">
				{#each avatarMembers as m (m.uri)}
					<div class="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0">
						{#if m.author.avatar}
							<img src={avatarThumbnail(m.author.avatar)} alt={m.author.handle} class="w-full h-full object-cover" />
						{/if}
					</div>
				{/each}
			</div>
			<div class="flex items-center gap-1.5 shrink-0">
				{#if anyUnread}
					<span class="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
				{/if}
				<span class="text-xs text-gray-400 dark:text-gray-500">{formatTime(notification.indexedAt)}</span>
			</div>
		</div>
		<p class="text-sm text-gray-800 dark:text-gray-200 mt-1.5 flex items-start gap-1">
			{@render reasonMark()}
			<span>
				<span class="font-semibold">{notification.author.displayName || notification.author.handle}</span>
				{t.notificationItem.others(groupMembers.length - 1)}が{label}
			</span>
		</p>
		{@render contentBody()}
	{:else}
		<div class="flex gap-3 items-start">
			<div class="shrink-0">
				<div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
					{#if notification.author.avatar}
						<img
							src={avatarThumbnail(notification.author.avatar)}
							alt={notification.author.handle}
							class="w-full h-full object-cover"
						/>
					{/if}
				</div>
			</div>

			<div class="flex-1 min-w-0">
				<div class="flex items-start justify-between gap-2">
					<p class="text-sm text-gray-800 dark:text-gray-200 flex items-start gap-1">
						{@render reasonMark()}
						<span>
							<span class="font-semibold">{notification.author.displayName || notification.author.handle}</span>が{label}
						</span>
					</p>
					<div class="flex items-center gap-1.5 shrink-0">
						{#if anyUnread}
							<span class="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
						{/if}
						<span class="text-xs text-gray-400 dark:text-gray-500">{formatTime(notification.indexedAt)}</span>
					</div>
				</div>

				{@render contentBody()}

				{#if canInteract && (onLike || onReply || onQuote)}
					<div class="flex items-center justify-end gap-2 mt-1.5">
						{#if onLike}
							<button
								onclick={() => onLike?.(notification.uri, notification.cid)}
								class="p-1 {liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}"
								aria-label={t.notificationItem.ariaLike}
							>
								<svg class="w-4 h-4" fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
								</svg>
							</button>
						{/if}
						{#if onReply}
							<button
								onclick={() => onReply?.(notification.uri, notification.cid)}
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
								onclick={() => onQuote?.(notification.uri, notification.cid)}
								class="p-1 text-gray-400 hover:text-[#f59e0b]"
								aria-label={t.notificationItem.ariaQuote}
							>
								<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M3 10.5h5.25v5.25L5.25 19.5H3l2.25-3.75H3V10.5zm7.5 0h5.25v5.25L12.75 19.5H10.5l2.25-3.75H10.5V10.5z" />
								</svg>
							</button>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>

{#if viewerOpen}
	<ImageViewer
		images={getImages(imagePost).map((img) => img.fullsize ?? img.thumb)}
		startIndex={viewerIndex}
		onClose={() => (viewerOpen = false)}
	/>
{/if}

{#if videoViewerOpen}
	{@const vid = getVideo(imagePost)!}
	<VideoViewer
		src={vid.playlist}
		thumbnail={vid.thumbnail}
		onClose={() => (videoViewerOpen = false)}
	/>
{/if}
