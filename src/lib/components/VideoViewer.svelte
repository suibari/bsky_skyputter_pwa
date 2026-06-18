<script lang="ts">
	let {
		src,
		thumbnail,
		onClose
	}: {
		src: string;
		thumbnail?: string;
		onClose: () => void;
	} = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
	role="dialog"
	aria-modal="true"
	onclick={onClose}
>
	<button
		class="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10"
		onclick={onClose}
		aria-label="閉じる"
	>
		<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
		</svg>
	</button>

	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		{src}
		poster={thumbnail}
		controls
		autoplay
		playsinline
		class="max-w-full max-h-[90dvh] object-contain"
		onclick={(e) => e.stopPropagation()}
	></video>
</div>
