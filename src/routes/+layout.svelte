<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { isAuthenticated } from '$lib/stores/auth.svelte';
	import { setUnreadCount } from '$lib/stores/notifications.svelte';
	import { getUnreadCount } from '$lib/api/notifications';
	import { loadTheme } from '$lib/stores/theme.svelte';

	let { children } = $props();

	const showNav = $derived(isAuthenticated() && $page.url.pathname !== '/login');

	onMount(async () => {
		loadTheme();

		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js').catch(() => {});
		}

		if (isAuthenticated()) {
			try {
				const count = await getUnreadCount();
				setUnreadCount(count);
			} catch {
				// ignore
			}
		}
	});
</script>

<div class="flex flex-col min-h-dvh max-w-md mx-auto bg-white dark:bg-gray-900">
	<main class="flex-1 {showNav ? 'pb-16' : ''}">
		{@render children()}
	</main>
	{#if showNav}
		<BottomNav />
	{/if}
</div>
<Toast />
