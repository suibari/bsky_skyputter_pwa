<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Draft } from '$lib/types/draft';
	import Modal from '$lib/components/Modal.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { showToast } from '$lib/stores/toast.svelte';
	import { getT, getLanguage } from '$lib/stores/language.svelte';
	import { getDrafts, deleteDraft } from '$lib/db/drafts';

	const t = $derived(getT());
	const currentLang = $derived(getLanguage());

	let drafts = $state<Draft[]>([]);
	let deleteTarget = $state<string | null>(null);
	let loading = $state(true);

	onMount(async () => {
		drafts = await getDrafts();
		loading = false;
	});

	function formatDate(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString(currentLang === 'ja' ? 'ja-JP' : 'en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function loadDraft(id: string) {
		goto(`/post?draftId=${id}`);
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		try {
			await deleteDraft(deleteTarget);
			drafts = drafts.filter((d) => d.id !== deleteTarget);
			showToast(t.drafts.toast.deleted, 'success');
		} catch {
			showToast(t.drafts.toast.deleteFailed, 'error');
		} finally {
			deleteTarget = null;
		}
	}
</script>

<div>
	<header class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
		<h1 class="text-base font-semibold text-gray-900 dark:text-gray-50">{t.drafts.header}</h1>
	</header>

	{#if loading}
		<div class="flex justify-center py-12">
			<LoadingSpinner />
		</div>
	{:else if drafts.length === 0}
		<p class="text-center text-sm text-gray-400 dark:text-gray-500 py-12">{t.drafts.empty}</p>
	{:else}
		{#each drafts as draft (draft.id)}
			<div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex gap-3">
				{#if draft.images.length > 0}
					<div class="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
						<img
							src={URL.createObjectURL(draft.images[0])}
							alt={t.drafts.altThumbnail}
							class="w-full h-full object-cover"
						/>
					</div>
				{/if}

				<button
					class="flex-1 text-left min-w-0"
					onclick={() => loadDraft(draft.id)}
				>
					<p class="text-sm text-gray-800 dark:text-gray-200 leading-relaxed line-clamp-2">
						{draft.text || t.drafts.noText}
					</p>
					<div class="flex items-center gap-2 mt-1">
						<span class="text-xs text-gray-400 dark:text-gray-500">{formatDate(draft.updatedAt)}</span>
						{#if draft.images.length > 0}
							<span class="text-xs text-gray-400 dark:text-gray-500">{t.drafts.imageCount(draft.images.length)}</span>
						{/if}
					</div>
				</button>

				<button
					onclick={() => (deleteTarget = draft.id)}
					class="p-2 text-gray-300 hover:text-red-500 flex-shrink-0"
					aria-label={t.drafts.ariaDelete}
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
					</svg>
				</button>
			</div>
		{/each}
	{/if}
</div>

<Modal
	open={!!deleteTarget}
	title={t.drafts.modal.title}
	message={t.drafts.modal.message}
	confirmLabel={t.common.delete}
	onConfirm={confirmDelete}
	onCancel={() => (deleteTarget = null)}
/>
