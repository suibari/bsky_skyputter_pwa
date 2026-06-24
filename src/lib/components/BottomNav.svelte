<script lang="ts">
	import { page } from '$app/stores';
	import {
		getUnreadCount,
		getNotificationsRefreshing,
		triggerNotificationsTap
	} from '$lib/stores/notifications.svelte';
	import { getT } from '$lib/stores/language.svelte';

	const t = $derived(getT());

	const BASE_TABS = [
		{ href: '/post',          icon: 'pencil'   },
		{ href: '/notifications', icon: 'bell',   badge: true },
		{ href: '/drafts',        icon: 'document' },
		{ href: '/profile',       icon: 'person'   },
		{ href: '/settings',      icon: 'cog'      }
	] as const;

	const tabs = $derived([
		{ ...BASE_TABS[0], label: t.nav.post          },
		{ ...BASE_TABS[1], label: t.nav.notifications },
		{ ...BASE_TABS[2], label: t.nav.drafts        },
		{ ...BASE_TABS[3], label: t.nav.profile       },
		{ ...BASE_TABS[4], label: t.nav.settings      }
	]);

	const isActive = (href: string) => $page.url.pathname === href;
</script>

<nav
	class="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center px-1 z-40"
>
	{#each tabs as tab}
		<a
			href={tab.href}
			onclick={(e) => {
				if (tab.href === '/notifications' && isActive('/notifications')) {
					e.preventDefault();
					triggerNotificationsTap();
				}
			}}
			ontouchend={(e) => {
				if (tab.href === '/notifications' && isActive('/notifications')) {
					e.preventDefault();
					triggerNotificationsTap();
				}
			}}
			class="relative flex-1 flex flex-col items-center gap-0.5 py-1 rounded-xl
				{isActive(tab.href) ? 'text-[#0085ff]' : 'text-gray-400'}"
			aria-current={isActive(tab.href) ? 'page' : undefined}
		>
			{#if tab.icon === 'pencil'}
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
					<path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
				</svg>
			{:else if tab.icon === 'person'}
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
				</svg>
			{:else if tab.icon === 'bell'}
				<div class="relative">
					<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
						<path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
					</svg>
					{#if isActive('/notifications') && getNotificationsRefreshing()}
						<span class="absolute inset-0 flex items-center justify-center pointer-events-none">
							<span class="block w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
						</span>
					{/if}
					{#if getUnreadCount() > 0}
						<span
							class="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center px-0.5 font-medium"
						>
							{getUnreadCount() > 99 ? '99+' : getUnreadCount()}
						</span>
					{/if}
				</div>
			{:else if tab.icon === 'document'}
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
					<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
				</svg>
			{:else if tab.icon === 'cog'}
				<svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
			{/if}
			<span class="text-[10px] font-medium">{tab.label}</span>
		</a>
	{/each}
</nav>
