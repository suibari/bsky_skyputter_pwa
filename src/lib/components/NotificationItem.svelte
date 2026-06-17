<script lang="ts">
	import type { AppBskyNotificationListNotifications, AppBskyFeedDefs } from '@atproto/api';

	type Notification = AppBskyNotificationListNotifications.Notification;

	let {
		notification,
		subjectPost,
		onLike,
		onReply,
		onQuote
	}: {
		notification: Notification;
		subjectPost?: AppBskyFeedDefs.PostView;
		onLike?: (uri: string, cid: string) => void;
		onReply?: (uri: string, cid: string) => void;
		onQuote?: (uri: string, cid: string) => void;
	} = $props();

	const reasonLabels: Record<string, string> = {
		like: 'いいねしました',
		repost: 'リポストしました',
		follow: 'フォローしました',
		mention: 'にメンションしました',
		reply: 'に返信しました',
		quote: 'を引用しました'
	};

	const reasonIcons: Record<string, { color: string; icon: string }> = {
		like: { color: '#ef4444', icon: 'heart' },
		repost: { color: '#22c55e', icon: 'repost' },
		follow: { color: '#0085ff', icon: 'follow' },
		mention: { color: '#8b5cf6', icon: 'at' },
		reply: { color: '#0085ff', icon: 'reply' },
		quote: { color: '#f59e0b', icon: 'quote' }
	};

	const label = $derived(reasonLabels[notification.reason] ?? notification.reason);
	const iconInfo = $derived(reasonIcons[notification.reason] ?? { color: '#6b7280', icon: 'bell' });
	const record = $derived(notification.record as { text?: string } | undefined);
	const canInteract = $derived(['reply', 'mention', 'quote'].includes(notification.reason));
	const subjectRecord = $derived(subjectPost?.record as { text?: string } | undefined);
	// like/repost は自分の投稿テキスト、reply/mention/quote は相手のテキストを表示
	const displayText = $derived(record?.text ?? subjectRecord?.text);

	let expanded = $state(false);

	function formatTime(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'たった今';
		if (mins < 60) return `${mins}分前`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}時間前`;
		return `${Math.floor(hours / 24)}日前`;
	}
</script>

<div class="px-4 py-3 border-b border-gray-100 flex gap-3 items-start">
	<div class="relative shrink-0">
		<div class="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
			{#if notification.author.avatar}
				<img
					src={notification.author.avatar}
					alt={notification.author.handle}
					class="w-full h-full object-cover"
				/>
			{/if}
		</div>
		<div
			class="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center"
			style="background-color: {iconInfo.color}"
		>
			{#if iconInfo.icon === 'heart'}
				<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
					<path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-2.184C4.032 12.416 2.5 10.272 2.5 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118.5 7.5c0 2.772-1.532 4.916-3.385 6.536a22.049 22.049 0 01-2.582 2.184 21.002 21.002 0 01-1.162.682l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
				</svg>
			{:else if iconInfo.icon === 'repost'}
				<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H5.498a.75.75 0 00-.75.75v3.498a.75.75 0 001.5 0v-1.732l.31.311a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V3.198a.75.75 0 00-1.5 0v1.544l-.311-.31a7 7 0 00-11.712 3.138.75.75 0 101.449.39A5.502 5.502 0 0114.5 3.74l.31.31h-2.433a.75.75 0 000 1.5h3.498a.75.75 0 00.53-.219z" clip-rule="evenodd" />
				</svg>
			{:else if iconInfo.icon === 'follow'}
				<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
					<path d="M11 5a3 3 0 11-6 0 3 3 0 016 0zM2.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 018 18a9.953 9.953 0 01-5.385-1.572zM16.25 5.75a.75.75 0 00-1.5 0v2h-2a.75.75 0 000 1.5h2v2a.75.75 0 001.5 0v-2h2a.75.75 0 000-1.5h-2v-2z" />
				</svg>
			{:else}
				<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 001.28.53l3.658-3.658A17.569 17.569 0 0015 14c2.236 0 4.43-.18 6.57-.524C23.007 13.245 24 11.986 24 10.574V5.426c0-1.413-.993-2.67-2.43-2.902A41.402 41.402 0 0015 2H10z" clip-rule="evenodd" />
				</svg>
			{/if}
		</div>
	</div>

	<div class="flex-1 min-w-0">
		<div class="flex items-start justify-between gap-2">
			<p class="text-sm text-gray-800">
				<span class="font-semibold">
					{notification.author.displayName || notification.author.handle}
				</span>
				が{label}
			</p>
			<div class="flex items-center gap-1.5 flex-shrink-0">
				{#if !notification.isRead}
					<span class="w-2 h-2 rounded-full bg-red-500 shrink-0"></span>
				{/if}
				<span class="text-xs text-gray-400">{formatTime(notification.indexedAt)}</span>
			</div>
		</div>

		{#if displayText}
			<button
				class="text-left w-full"
				onclick={() => (expanded = !expanded)}
				aria-label={expanded ? '折りたたむ' : '展開する'}
			>
				<p class="text-xs text-gray-500 mt-0.5 {expanded ? '' : 'line-clamp-2'}">{displayText}</p>
				<span class="text-xs text-gray-400">{expanded ? '▲' : '▼'}</span>
			</button>
		{/if}

		{#if canInteract && (onLike || onReply || onQuote)}
			<div class="flex items-center justify-end gap-2 mt-1.5">
				{#if onLike}
					<button
						onclick={() => onLike?.(notification.uri, notification.cid)}
						class="p-1 text-gray-400 hover:text-red-500"
						aria-label="いいね"
					>
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
						</svg>
					</button>
				{/if}
				{#if onReply}
					<button
						onclick={() => onReply?.(notification.uri, notification.cid)}
						class="p-1 text-gray-400 hover:text-[#0085ff]"
						aria-label="返信"
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
						aria-label="引用"
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
