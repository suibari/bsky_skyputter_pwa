<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { saveSession } from '$lib/stores/auth.svelte';
	import { showToast } from '$lib/stores/toast.svelte';
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

	let error = $state('');

	onMount(async () => {
		const params = $page.url.searchParams;
		const accessJwt = params.get('accessJwt');
		const did = params.get('did');
		const handle = params.get('handle');

		if (!accessJwt || !did || !handle) {
			error = 'コールバックパラメーターが不正です';
			return;
		}

		try {
			const profileRes = await fetch(
				`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`
			);
			const avatar = profileRes.ok
				? ((await profileRes.json()) as { avatar?: string }).avatar
				: undefined;

			saveSession({ accessJwt, did, handle, avatar });
			goto('/post', { replaceState: true });
		} catch (e) {
			error = e instanceof Error ? e.message : 'ログイン処理に失敗しました';
			showToast(error, 'error');
		}
	});
</script>

<div class="flex flex-col items-center justify-center min-h-dvh gap-4 px-6">
	{#if error}
		<p class="text-red-500 text-sm text-center">{error}</p>
		<a href="/login" class="text-sm text-[#0085ff] underline">ログイン画面に戻る</a>
	{:else}
		<LoadingSpinner size={32} />
		<p class="text-sm text-gray-500">ログイン処理中...</p>
	{/if}
</div>
