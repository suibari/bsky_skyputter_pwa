<script lang="ts">
	import { getT } from '$lib/stores/language.svelte';

	let {
		open = false,
		title = '',
		message = '',
		confirmLabel,
		onConfirm,
		onCancel
	}: {
		open?: boolean;
		title?: string;
		message?: string;
		confirmLabel?: string;
		onConfirm: () => void;
		onCancel: () => void;
	} = $props();

	const t = $derived(getT());
</script>

{#if open}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
		<div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">{title}</h2>
			<p class="text-gray-600 dark:text-gray-400 mb-6 text-sm">{message}</p>
			<div class="flex gap-3 justify-end">
				<button
					onclick={onCancel}
					class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium"
				>
					{t.modal.cancel}
				</button>
				<button
					onclick={onConfirm}
					class="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium"
				>
					{confirmLabel ?? t.common.delete}
				</button>
			</div>
		</div>
	</div>
{/if}
