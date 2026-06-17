<script lang="ts">
	let {
		images,
		startIndex = 0,
		onClose
	}: {
		images: string[];
		startIndex?: number;
		onClose: () => void;
	} = $props();

	let currentIndex = $state(startIndex);

	function prev(e: Event) {
		e.stopPropagation();
		if (currentIndex > 0) currentIndex--;
	}

	function next(e: Event) {
		e.stopPropagation();
		if (currentIndex < images.length - 1) currentIndex++;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
		if (e.key === 'ArrowLeft') currentIndex = Math.max(0, currentIndex - 1);
		if (e.key === 'ArrowRight') currentIndex = Math.min(images.length - 1, currentIndex + 1);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
	role="dialog"
	aria-modal="true"
	onclick={onClose}
>
	<button
		class="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
		onclick={onClose}
		aria-label="閉じる"
	>
		<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
		</svg>
	</button>

	<img
		src={images[currentIndex]}
		alt="画像"
		class="max-w-full max-h-[90dvh] object-contain select-none"
		onclick={(e) => e.stopPropagation()}
		draggable="false"
	/>

	{#if images.length > 1}
		<button
			class="absolute left-3 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white disabled:opacity-30"
			onclick={prev}
			disabled={currentIndex === 0}
			aria-label="前の画像"
		>
			<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
			</svg>
		</button>
		<button
			class="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-white/80 hover:text-white disabled:opacity-30"
			onclick={next}
			disabled={currentIndex === images.length - 1}
			aria-label="次の画像"
		>
			<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
			</svg>
		</button>
		<div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
			{#each images as _, i}
				<span class="w-1.5 h-1.5 rounded-full {i === currentIndex ? 'bg-white' : 'bg-white/40'}"></span>
			{/each}
		</div>
	{/if}
</div>
