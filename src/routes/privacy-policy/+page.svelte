<script lang="ts">
	import { getT } from '$lib/stores/language.svelte';

	const t = $derived(getT());
</script>

<div class="max-w-2xl mx-auto px-4 py-10">
	<h1 class="text-xl font-bold text-gray-900 dark:text-gray-50 mb-6">{t.privacyPolicy.title}</h1>

	{#each t.privacyPolicy.sections as section}
		<section class="mb-6">
			<h2 class="text-base font-semibold text-gray-800 dark:text-gray-200 mb-2">{section.heading}</h2>
			{#if typeof section.content === 'string'}
				<p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{section.content}</p>
			{:else if section.content.type === 'list'}
				<ul class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2 list-disc list-inside">
					{#each section.content.items as item}
						<li>{item}</li>
					{/each}
				</ul>
			{:else if section.content.type === 'paragraph-with-link'}
				<p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
					{section.content.before}<a
						href={section.content.linkHref}
						target="_blank"
						rel="noopener noreferrer"
						class="underline hover:text-gray-800 dark:hover:text-gray-200"
					><strong>{section.content.linkLabel}</strong></a>{section.content.after}
				</p>
			{/if}
		</section>
	{/each}

	<p class="text-xs text-gray-400 dark:text-gray-500 mt-8">{t.privacyPolicy.lastUpdated}</p>
</div>
