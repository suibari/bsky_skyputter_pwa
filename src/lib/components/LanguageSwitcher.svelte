<script lang="ts">
	import { getLanguage, setLanguage, getT, type Language } from '$lib/stores/language.svelte';

	const langs: { value: Language }[] = [
		{ value: 'ja' },
		{ value: 'en' }
	];

	const t = $derived(getT());
</script>

<div class="flex gap-2">
	{#each langs as lang}
		<button
			onclick={() => setLanguage(lang.value)}
			class="flex-1 py-2 rounded-xl text-sm font-medium border transition-colors
				{getLanguage() === lang.value
					? 'bg-[#0085ff] text-white border-[#0085ff]'
					: 'bg-transparent text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'}"
		>
			{t.settings.language[lang.value]}
		</button>
	{/each}
</div>
