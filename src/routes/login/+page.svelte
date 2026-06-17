<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { saveSession } from '$lib/stores/auth.svelte';
	import { showToast } from '$lib/stores/toast.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

	let handle = $state('');
	let password = $state('');
	let loading = $state(false);

	onMount(() => {
		// OAuth コールバックから戻った場合（handle がないケースの fallback）
		const params = $page.url.searchParams;
		const accessJwt = params.get('accessJwt');
		const did = params.get('did');
		const h = params.get('handle');

		if (accessJwt && did && h) {
			saveSession({ accessJwt, did, handle: h });
			goto('/post', { replaceState: true });
		}
	});

	function handleOAuth() {
		if (!handle.trim()) {
			showToast('Handle を入力してください', 'error');
			return;
		}
		window.location.href = `${PUBLIC_API_URL}/oauth/login?handle=${encodeURIComponent(handle.trim())}`;
	}

	async function handlePasswordLogin() {
		if (!handle || !password) return;
		loading = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/oauth/app-password-login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ identifier: handle.trim(), password })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({})) as { error?: string };
				throw new Error(err.error ?? 'ログインに失敗しました');
			}
			const { did, handle: h, accessJwt, refreshJwt } = await res.json() as { did: string; handle: string; accessJwt: string; refreshJwt?: string };
			saveSession({ accessJwt, refreshJwt, did, handle: h });
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

		<div class="space-y-4 mb-6">
			<div>
				<label class="block text-xs font-medium text-gray-500 mb-1" for="handle">
					Handle
				</label>
				<input
					id="handle"
					type="text"
					bind:value={handle}
					class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0085ff] focus:border-transparent"
					placeholder="example.bsky.social"
					autocomplete="username"
				/>
			</div>

			<div>
				<label class="block text-xs font-medium text-gray-500 mb-1" for="password">
					App Password
				</label>
				<input
					id="password"
					type="password"
					bind:value={password}
					class="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#0085ff] focus:border-transparent"
					placeholder="xxxx-xxxx-xxxx-xxxx"
					autocomplete="current-password"
				/>
			</div>
			<button
				onclick={handlePasswordLogin}
				disabled={loading || !handle || !password}
				class="w-full py-3 rounded-xl bg-[#0085ff] text-white font-semibold text-sm
					disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
			>
				{#if loading}
					<LoadingSpinner size={18} />
				{/if}
				App Password でログイン
			</button>

			<div class="relative">
				<div class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-gray-200"></div>
				</div>
				<div class="relative flex justify-center">
					<span class="bg-white px-3 text-xs text-gray-400">または</span>
				</div>
			</div>

			<button
				onclick={handleOAuth}
				disabled={!handle.trim()}
				class="w-full py-3 rounded-xl bg-[#0085ff] text-white font-semibold text-sm flex items-center justify-center gap-2
					disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.3-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/>
				</svg>
				Bluesky でログイン
			</button>
		</div>
	</div>

	<p class="text-center text-xs text-gray-400 mt-8">しずか、でもとどく</p>
</div>
