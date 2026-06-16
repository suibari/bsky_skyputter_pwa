<script lang="ts">
	import { getToasts } from '$lib/stores/toast.svelte';
</script>

<div class="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
	{#each getToasts() as toast (toast.id)}
		<div
			class="px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white pointer-events-auto
				{toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-gray-700'}"
		>
			{toast.message}
		</div>
	{/each}
</div>
