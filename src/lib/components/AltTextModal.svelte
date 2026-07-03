<script lang="ts">
	import { getT } from '$lib/stores/language.svelte';

	let {
		open = false,
		imageUrl = '',
		initialAlt = '',
		onSave,
		onCancel
	}: {
		open?: boolean;
		imageUrl?: string;
		initialAlt?: string;
		onSave: (alt: string) => void;
		onCancel: () => void;
	} = $props();

	let altText = $state('');

	$effect(() => {
		if (open) altText = initialAlt;
	});

	const t = $derived(getT());
</script>

{#if open}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black/50 flex items-end justify-center z-50"
		onpointerdown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
	>
		<div class="bg-white dark:bg-gray-800 rounded-t-2xl p-4 w-full max-w-md shadow-xl">
			<h2 class="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">{t.imagePicker.altModal.title}</h2>
			{#if imageUrl}
				<img src={imageUrl} alt="" class="w-full h-40 object-contain rounded-xl bg-gray-100 dark:bg-gray-700 mb-3" />
			{/if}
			<textarea
				bind:value={altText}
				placeholder={t.imagePicker.altModal.placeholder}
				maxlength={1000}
				rows={3}
				class="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0085ff]"
			></textarea>
			<p class="text-right text-xs text-gray-400 mt-1 mb-3">{t.imagePicker.altModal.charCount(altText.length)}</p>
			<div class="flex gap-2">
				<button
					onclick={onCancel}
					class="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium"
				>
					{t.common.cancel}
				</button>
				<button
					onclick={() => onSave(altText)}
					class="flex-1 py-2 rounded-xl bg-[#0085ff] text-white text-sm font-medium"
				>
					{t.imagePicker.altModal.save}
				</button>
			</div>
		</div>
	</div>
{/if}
