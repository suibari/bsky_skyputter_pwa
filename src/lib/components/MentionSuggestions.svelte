<script lang="ts">
	import type { AppBskyActorDefs } from '@atproto/api';
	import LoadingSpinner from './LoadingSpinner.svelte';
	import { avatarThumbnail } from '$lib/image';

	let {
		actors,
		loading,
		focusIndex,
		onSelect
	}: {
		actors: AppBskyActorDefs.ProfileViewBasic[];
		loading: boolean;
		focusIndex: number;
		onSelect: (actor: AppBskyActorDefs.ProfileViewBasic) => void;
	} = $props();

	let listEl = $state<HTMLUListElement | undefined>(undefined);

	$effect(() => {
		if (focusIndex < 0 || !listEl) return;
		(listEl.children[focusIndex] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
	});
</script>

<div class="shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 max-h-48 overflow-y-auto" data-mention-suggestions>
	{#if loading}
		<div class="flex items-center justify-center py-3">
			<LoadingSpinner size={18} />
		</div>
	{:else if actors.length === 0}
		<p class="text-sm text-gray-400 dark:text-gray-500 text-center py-3">見つかりませんでした</p>
	{:else}
		<ul bind:this={listEl}>
			{#each actors as actor, i}
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<li
					class="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 {i === focusIndex ? 'bg-blue-50 dark:bg-blue-950' : ''}"
					onmousedown={(e) => { e.preventDefault(); onSelect(actor); }}
					ontouchend={(e) => { e.preventDefault(); onSelect(actor); }}
				>
					<div class="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 overflow-hidden">
						{#if actor.avatar}
							<img
								src={avatarThumbnail(actor.avatar)}
								alt={actor.displayName ?? actor.handle}
								class="w-full h-full object-cover"
								onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
							/>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
							{actor.displayName ?? actor.handle}
						</p>
						<p class="text-xs text-gray-500 dark:text-gray-400 truncate">@{actor.handle}</p>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
