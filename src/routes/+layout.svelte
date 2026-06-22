<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { isAuthenticated } from '$lib/stores/auth.svelte';
	import { setUnreadCount, triggerNotificationsPush } from '$lib/stores/notifications.svelte';
	import { getUnreadCount, markSeen } from '$lib/api/notifications';
	import { loadTheme } from '$lib/stores/theme.svelte';
	import { loadLanguage } from '$lib/stores/language.svelte';

	let { children } = $props();

	const showNav = $derived(isAuthenticated() && $page.url.pathname !== '/login');

	onMount(async () => {
		loadTheme();
		loadLanguage();

		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js').catch(() => {});
		}

		const refreshCount = async () => {
			if (isAuthenticated()) {
				try {
					const count = await getUnreadCount();
					setUnreadCount(count);
				} catch {
					// ignore
				}
			}
		};

		// 溜まったデバイス通知を全クローズし、SW 側の集約カウンタもリセットする。
		// 端末通知を閉じるだけで、自動リロード（postMessage）には影響しない。
		const clearDeviceNotifications = () => {
			if (!('serviceWorker' in navigator)) return;
			navigator.serviceWorker.ready
				.then((reg) => reg.getNotifications())
				.then((ns) => ns.forEach((n) => n.close()))
				.catch(() => {});
		};

		await refreshCount();

		const onVisibility = () => {
			if (document.visibilityState === 'visible') {
				refreshCount();
				clearDeviceNotifications();
			}
		};
		document.addEventListener('visibilitychange', onVisibility);

		const onSwMessage = async (event: MessageEvent) => {
			if (event.data?.type !== 'NEW_NOTIFICATION') return;
			// アクティブ（フォーカスあり）かつ通知画面のときだけ抑制する。
			// 非アクティブ時は OS 通知を残し、バッジだけ更新する。
			if (document.hasFocus() && $page.url.pathname === '/notifications') {
				try { await markSeen(); } catch {}
				setUnreadCount(0);
				triggerNotificationsPush();
				clearDeviceNotifications();
			} else {
				refreshCount();
			}
		};
		navigator.serviceWorker.addEventListener('message', onSwMessage);

		return () => {
			document.removeEventListener('visibilitychange', onVisibility);
			navigator.serviceWorker.removeEventListener('message', onSwMessage);
		};
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
