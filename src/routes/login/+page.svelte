<script lang="ts">
	import { goto } from '$app/navigation';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { saveSession } from '$lib/stores/auth.svelte';
	import { oauthClient } from '$lib/stores/oauth-client';
	import { showToast } from '$lib/stores/toast.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

	let handle = $state('');
	let password = $state('');
	let loading = $state(false);

	async function handleOAuth() {
		if (!handle.trim()) {
			showToast('Handle を入力してください', 'error');
			return;
		}
		loading = true;
		try {
			await oauthClient.signIn(handle.trim());
			// signIn は PDS へリダイレクトするため以降は実行されない
		} catch (e) {
			showToast(e instanceof Error ? e.message : 'OAuth ログインに失敗しました', 'error');
			loading = false;
		}
	}

	async function handlePasswordLogin() {
		if (!handle || !password) return;
		loading = true;
		try {
			const res = await fetch(`${PUBLIC_API_URL}/login/app-password`, {
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
		<div class="mb-6">
			<img src="/skyputter_logo.png" alt="SkyPutter" class="h-12 object-contain mb-2" />
			<p class="text-gray-500 text-sm">アウトプッターのための半投稿専用＋通知Blueskyクライアント</p>
		</div>

		<p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
			タイムラインを見ている余裕はない、だけどアウトプットはしたいし、リプライにも応えたい。そんなあなたのためのアプリです。
		</p>

		<div class="space-y-2 mb-8">
			<div class="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
				<svg class="w-5 h-5 text-[#0085ff] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
				</svg>
				<div>
					<p class="text-sm font-semibold text-gray-800 dark:text-gray-200">タイムラインを見れません</p>
					<p class="text-xs text-gray-500 dark:text-gray-400">インプットを絞って、アウトプットに集中しよう。</p>
				</div>
			</div>
			<div class="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
				<svg class="w-5 h-5 text-[#0085ff] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
				</svg>
				<div>
					<p class="text-sm font-semibold text-gray-800 dark:text-gray-200">通知はリアルタイムで受けられます</p>
					<p class="text-xs text-gray-500 dark:text-gray-400">みんなからのリアクションを受け止めよう。</p>
				</div>
			</div>
			<div class="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
				<svg class="w-5 h-5 text-[#0085ff] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
				</svg>
				<div>
					<p class="text-sm font-semibold text-gray-800 dark:text-gray-200">いいねの数はみれません</p>
					<p class="text-xs text-gray-500 dark:text-gray-400">マインドフルネスで、今受けたいいねをかみしめよう。</p>
				</div>
			</div>
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
					<span class="bg-white dark:bg-gray-900 px-3 text-xs text-gray-400">または</span>
				</div>
			</div>

			<button
				onclick={handleOAuth}
				disabled={loading || !handle.trim()}
				class="w-full py-3 rounded-xl bg-[#0085ff] text-white font-semibold text-sm flex items-center justify-center gap-2
					disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if loading}
					<LoadingSpinner size={18} class="text-white" />
				{:else}
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.204-.659-.3-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/>
					</svg>
				{/if}
				Bluesky でログイン
			</button>
		</div>
	</div>

	<p class="text-center text-xs text-gray-400 mt-4">
		<a href="/privacy-policy" class="underline hover:text-gray-600 dark:hover:text-gray-300">プライバシーポリシー</a>
	</p>
	<p class="text-center text-xs text-gray-400 mt-2">しずか、でもとどく</p>
</div>
