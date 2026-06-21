<script lang="ts">
	import type { OgpData } from '$lib/api/ogp';
	import { getT } from '$lib/stores/language.svelte';

	const t = $derived(getT());

	let {
		ogp,
		loading,
		onDismiss
	}: {
		ogp: OgpData | null;
		loading: boolean;
		onDismiss: () => void;
	} = $props();

	function hostname(uri: string): string {
		try { return new URL(uri).hostname; } catch { return uri; }
	}
</script>

<div class="mx-4 mb-1 border border-gray-200 rounded-xl bg-gray-50 overflow-hidden relative shrink-0">
	<button
		onclick={onDismiss}
		class="absolute top-1.5 right-2 text-gray-400 hover:text-gray-600 text-xs z-10"
		aria-label={t.linkCard.ariaRemove}
	>✕</button>

	{#if loading}
		<div class="flex gap-3 p-3 pr-8">
			<div class="w-16 h-16 bg-gray-200 rounded-lg animate-pulse shrink-0"></div>
			<div class="flex-1 space-y-2 py-1">
				<div class="h-3 bg-gray-200 rounded animate-pulse w-1/3"></div>
				<div class="h-3 bg-gray-200 rounded animate-pulse w-full"></div>
				<div class="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
			</div>
		</div>
	{:else if ogp}
		{#if ogp.thumb}
			<img src={ogp.thumb} alt={ogp.title} class="w-full max-h-36 object-cover" />
		{/if}
		<div class="px-3 py-2 pr-8">
			<p class="text-xs text-gray-400 truncate">{hostname(ogp.uri)}</p>
			<p class="text-sm font-medium text-gray-900 line-clamp-2">{ogp.title}</p>
			{#if ogp.description}
				<p class="text-xs text-gray-500 line-clamp-1 mt-0.5">{ogp.description}</p>
			{/if}
		</div>
	{/if}
</div>
