<script lang="ts">
	import { getT } from '$lib/stores/language.svelte';
	let { size = 24, class: className = 'text-[#0085ff]' }: { size?: number; class?: string } = $props();
	const t = $derived(getT());
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	class="animate-spin {className}"
	aria-label={t.loadingSpinner.ariaLabel}
>
	<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25" />
	<path
		d="M12 2a10 10 0 0 1 10 10"
		stroke="currentColor"
		stroke-width="3"
		stroke-linecap="round"
	/>
</svg>
