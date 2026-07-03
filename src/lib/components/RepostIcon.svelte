<script lang="ts">
	let { class: className = 'w-4 h-4', strokeWidth = 2 } = $props<{
		class?: string;
		strokeWidth?: number;
	}>();
</script>

<svg
	class={className}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<path d="m17 2 4 4-4 4" />
	<path d="M3 11v-1a4 4 0 0 1 4-4h14" />
	<path d="m7 22-4-4 4-4" />
	<path d="M21 13v1a4 4 0 0 1-4 4H3" />
</svg>
