<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getT } from '$lib/stores/language.svelte';

	let {
		video = $bindable<File | null>(null)
	}: {
		video?: File | null;
	} = $props();

	const t = $derived(getT());

	let fileInput: HTMLInputElement;
	let preview = $state<string | null>(null);

	$effect(() => {
		if (video) {
			const url = URL.createObjectURL(video);
			preview = url;
			return () => URL.revokeObjectURL(url);
		} else {
			preview = null;
		}
	});

	function handleFileChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file && file.type.startsWith('video/')) {
			video = file;
		}
		fileInput.value = '';
	}

	function removeVideo() {
		video = null;
	}
</script>

{#if preview && video}
	<div class="relative w-full rounded-xl overflow-hidden border border-gray-200 bg-black">
		<video src={preview} class="w-full max-h-48 object-contain" controls muted playsinline>
			<track kind="captions" />
		</video>
		<button
			onclick={removeVideo}
			class="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center"
			aria-label={t.videoPicker.ariaRemove}
		>
			<svg class="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
				<path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
			</svg>
		</button>
		<p class="absolute bottom-2 left-2 text-white text-xs bg-black/40 px-2 py-0.5 rounded-full">
			{video.name}
		</p>
	</div>
{:else}
	<button
		onclick={() => fileInput.click()}
		class="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400"
		aria-label={t.videoPicker.ariaAdd}
	>
		<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
		</svg>
		<span class="text-[10px]">{t.videoPicker.label}</span>
	</button>
{/if}

<input
	bind:this={fileInput}
	type="file"
	accept="video/*"
	class="hidden"
	onchange={handleFileChange}
/>
