<script lang="ts">
	import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
	import { getT } from '$lib/stores/language.svelte';
	// OAuth コールバック処理は +layout.ts の oauthClient.init() が行う。
	// このページはローディング表示のみ。認証完了後はレイアウトが /post へリダイレクトする。

	const t = $derived(getT());
</script>

<div class="flex flex-col items-center justify-center min-h-dvh gap-4 px-6">
	<LoadingSpinner size={32} />
	<p class="text-sm text-gray-500">{t.oauthCallback.processing}</p>
</div>
