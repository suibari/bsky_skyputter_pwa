<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { BskyAgent } from '@atproto/api';
	import { PUBLIC_API_URL, PUBLIC_DEV_MODE } from '$env/static/public';
	import { saveSession } from '$lib/stores/auth.svelte';
	import { showToast } from '$lib/stores/toast.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

	const isDevMode = PUBLIC_DEV_MODE === 'true';

	let serviceHost = $state('https://bsky.social');
	let identifier = $state('');
	let password = $state('');
	let loading = $state(false);

	onMount(() => {
		const params = $page.url.searchParams;
		const accessJwt = params.get('accessJwt');
		const refreshJwt = params.get('refreshJwt');
		const did = params.get('did');
		const handle = params.get('handle');

		if (accessJwt && refreshJwt && did && handle) {
			saveSession({ accessJwt, refreshJwt, did, handle });
			goto('/post', { replaceState: true });
		}
	});

	function handleOAuth() {
		const returnUrl = encodeURIComponent(window.location.origin + '/login');
		window.location.href = `${PUBLIC_API_URL}/auth/login?return_url=${returnUrl}`;
	}

	async function handleAppPassword() {
		if (!identifier || !password) return;
		loading = true;
		try {
			const agent = new BskyAgent({ service: serviceHost });
			const res = await agent.login({ identifier, password });
			saveSession({
				accessJwt: res.data.accessJwt,
				refreshJwt: res.data.refreshJwt,
				did: res.data.did,
				handle: res.data.handle
			});
			goto('/post');
		} catch (e) {
			showToast(e instanceof Error ? e.message : 'ログインに失敗しました', 'error');
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex flex-col min-h-dvh px-6 py-12">
	<div class="flex-1 flex flex-col justify-center">
		<div class="mb-10">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">SkyPutter</h1>
			<p class="text-gray-500 text-sm">Bluesky へのアウトプット専用アプリ</p>
		</div>

		{#if isDevMode}
			<div class="space-y-4 mb-6">
				<div>
					<label class="block text-xs font-medium text-gray-500 mb-1" for="service-host">
						Service Host
					</label>
					<input
						id="service-host"
						type="url"
						bind:value={serviceHost}
						class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0085ff] focus:border-transparent"
						placeholder="https://bsky.social"
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-500 mb-1" for="identifier">
						Handle
					</label>
					<input
						id="identifier"
						type="text"
						bind:value={identifier}
						class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0085ff] focus:border-transparent"
						placeholder="example.bsky.social"
						autocomplete="username"
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-500 mb-1" for="password">
						Password
					</label>
					<input
						id="password"
						type="password"
						bind:value={password}
						class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0085ff] focus:border-transparent"
						placeholder="App Password"
						autocomplete="current-password"
					/>
				</div>
				<button
					onclick={handleAppPassword}
					disabled={loading || !identifier || !password}
					class="w-full py-3 rounded-xl bg-[#0085ff] text-white font-semibold text-sm
						disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{#if loading}
						<LoadingSpinner size={18} />
					{/if}
					ログイン
				</button>
			</div>

			<div class="relative mb-6">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-gray-200"></div>
				</div>
				<div class="relative flex justify-center">
					<span class="bg-white px-3 text-xs text-gray-400">または</span>
				</div>
			</div>
		{/if}

		<button
			onclick={handleOAuth}
			class="w-full py-3 rounded-xl bg-[#0085ff] text-white font-semibold text-sm flex items-center justify-center gap-2"
		>
			<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
			</svg>
			Bluesky でログイン
		</button>
	</div>

	<p class="text-center text-xs text-gray-400 mt-8">しずか、でもとどく</p>
</div>
