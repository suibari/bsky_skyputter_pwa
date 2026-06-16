<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import LoadingSpinner from './LoadingSpinner.svelte';

	let {
		onLoadMore,
		loading = false,
		hasMore = true
	}: {
		onLoadMore: () => void;
		loading?: boolean;
		hasMore?: boolean;
	} = $props();

	let sentinel: HTMLDivElement;
	let observer: IntersectionObserver;

	onMount(() => {
		observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && !loading && hasMore) {
					onLoadMore();
				}
			},
			{ rootMargin: '200px' }
		);
		observer.observe(sentinel);
	});

	onDestroy(() => observer?.disconnect());
</script>

<div bind:this={sentinel} class="h-1"></div>
{#if loading}
	<div class="flex justify-center py-6">
		<LoadingSpinner />
	</div>
{/if}
{#if !hasMore && !loading}
	<p class="text-center text-sm text-gray-400 py-6">すべて読み込みました</p>
{/if}
