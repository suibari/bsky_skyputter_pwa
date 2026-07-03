<script lang="ts">
	import { onDestroy } from 'svelte';
	import { getT } from '$lib/stores/language.svelte';
	import AltTextModal from './AltTextModal.svelte';

	let {
		images = $bindable<File[]>([]),
		alts = $bindable<string[]>([]),
		maxImages = 10
	}: {
		images?: File[];
		alts?: string[];
		maxImages?: number;
	} = $props();

	let fileInput: HTMLInputElement;
	let previews = $state<string[]>([]);
	const urlMap = new Map<File, string>();

	let altModalOpen = $state(false);
	let altModalIndex = $state(-1);

	$effect(() => {
		const currentSet = new Set(images);
		for (const [file, url] of urlMap) {
			if (!currentSet.has(file)) {
				URL.revokeObjectURL(url);
				urlMap.delete(file);
			}
		}
		for (const file of images) {
			if (!urlMap.has(file)) {
				urlMap.set(file, URL.createObjectURL(file));
			}
		}
		previews = images.map((f) => urlMap.get(f) ?? '');
	});

	onDestroy(() => {
		for (const url of urlMap.values()) URL.revokeObjectURL(url);
	});

	function handleFileChange(e: Event) {
		const files = Array.from((e.target as HTMLInputElement).files ?? []);
		const remaining = maxImages - images.length;
		const newFiles = files.slice(0, remaining).filter((f) => f.type.startsWith('image/'));
		images = [...images, ...newFiles];
		alts = [...alts, ...newFiles.map(() => '')];
		fileInput.value = '';
	}

	function removeImage(index: number) {
		images = images.filter((_, i) => i !== index);
		alts = alts.filter((_, i) => i !== index);
	}

	function openAltModal(index: number) {
		altModalIndex = index;
		altModalOpen = true;
	}

	function handleAltSave(alt: string) {
		const next = [...alts];
		next[altModalIndex] = alt;
		alts = next;
		altModalOpen = false;
	}

	const t = $derived(getT());
</script>

<div class="flex gap-2 overflow-x-auto pb-1 snap-x">
	{#each previews as preview, i}
		<div class="relative w-24 h-24 shrink-0 snap-start">
			<button
				onclick={() => openAltModal(i)}
				class="w-full h-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0085ff]"
				aria-label={t.imagePicker.altModal.ariaOpen(i + 1)}
			>
				<img src={preview} alt={t.imagePicker.altPreview(i + 1)} class="w-full h-full object-cover" />
				{#if alts[i]}
					<span class="absolute bottom-1 left-1 text-[10px] leading-none bg-black/60 text-white px-1 py-0.5 rounded">ALT</span>
				{/if}
			</button>
			<button
				onclick={() => removeImage(i)}
				class="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center z-10"
				aria-label={t.imagePicker.ariaRemove}
			>
				<svg class="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
					<path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
				</svg>
			</button>
		</div>
	{/each}

	{#if images.length < maxImages}
		<button
			onclick={() => fileInput.click()}
			class="w-24 h-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 shrink-0 snap-start"
			aria-label={t.imagePicker.ariaAdd}
		>
			<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
			</svg>
		</button>
	{/if}
</div>

<input
	bind:this={fileInput}
	type="file"
	accept="image/*"
	multiple
	class="hidden"
	onchange={handleFileChange}
/>

<AltTextModal
	open={altModalOpen}
	imageUrl={previews[altModalIndex] ?? ''}
	initialAlt={alts[altModalIndex] ?? ''}
	onSave={handleAltSave}
	onCancel={() => { altModalOpen = false; }}
/>
