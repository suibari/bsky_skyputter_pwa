<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { PUBLIC_API_URL } from '$env/static/public';
	import { getSession, clearSession, cacheAvatar } from '$lib/stores/auth.svelte';
	import { createAgent } from '$lib/api/agent';
	import { oauthClient } from '$lib/stores/oauth-client';
	import { showToast } from '$lib/stores/toast.svelte';

	let pushEnabled = $state(false);
	let pushLoading = $state(false);
	const session = $derived(getSession());
	let myAvatar = $state<string | undefined>(getSession()?.avatar);

	onMount(async () => {
		const s = getSession();
		if (s && !s.avatar) {
			const agent = await createAgent();
			const profile = await agent.getProfile({ actor: s.did });
			if (profile.data.avatar) {
				myAvatar = profile.data.avatar;
				cacheAvatar(profile.data.avatar);
			}
		}

		if ('serviceWorker' in navigator && 'PushManager' in window) {
			try {
				const reg = await navigator.serviceWorker.ready;
				const sub = await reg.pushManager.getSubscription();
				pushEnabled = !!sub;
			} catch {
				// ignore
			}
		}
	});

	function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
		const rawData = atob(base64);
		const array = new Uint8Array(rawData.length);
		for (let i = 0; i < rawData.length; i++) {
			array[i] = rawData.charCodeAt(i);
		}
		return array;
	}

	async function togglePush() {
		if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
			showToast('このブラウザはPush通知に対応していません', 'error');
			return;
		}
		pushLoading = true;
		try {
			const reg = await navigator.serviceWorker.ready;
			if (pushEnabled) {
				const sub = await reg.pushManager.getSubscription();
				if (sub) {
					await sub.unsubscribe();
					pushEnabled = false;
					showToast('Push通知をオフにしました', 'info');
				}
			} else {
				const perm = await Notification.requestPermission();
				if (perm !== 'granted') {
					showToast('通知の許可が必要です', 'error');
					return;
				}

				const vapidRes = await fetch(`${PUBLIC_API_URL}/api/push/vapid-public-key`);
				if (!vapidRes.ok) throw new Error('VAPIDキーの取得に失敗しました');
				const { publicKey } = await vapidRes.json();

				const sub = await reg.pushManager.subscribe({
					userVisibleOnly: true,
					applicationServerKey: urlBase64ToUint8Array(publicKey)
				});

				const s = getSession();
				if (!s) throw new Error('Not authenticated');

				const res = await fetch(`${PUBLIC_API_URL}/api/push/subscribe`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${s.accessJwt}`
					},
					body: JSON.stringify({ subscription: sub.toJSON() })
				});
				if (!res.ok) throw new Error('Push購読の登録に失敗しました');

				pushEnabled = true;
				showToast('Push通知をオンにしました', 'success');
			}
		} catch (e) {
			showToast(e instanceof Error ? e.message : 'エラーが発生しました', 'error');
		} finally {
			pushLoading = false;
		}
	}

	async function handleLogout() {
		const s = getSession();
		if (s?.type === 'oauth') {
			try {
				await oauthClient.revoke(s.did);
			} catch {
				// revoke失敗でもローカルセッションは削除する
			}
		}
		clearSession();
		goto('/login');
	}
</script>

<div>
	<header class="px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
		<h1 class="text-base font-semibold text-gray-900">設定</h1>
	</header>

	<div class="px-4 pt-2">
		{#if session}
			<div class="flex items-center gap-3 py-4 border-b border-gray-100">
				<div class="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
					<img
						src={myAvatar}
						alt="アバター"
						class="w-full h-full object-cover"
						onerror={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
					/>
				</div>
				<div>
					<p class="font-semibold text-sm text-gray-900">@{session.handle}</p>
					<p class="text-xs text-gray-400">{session.did}</p>
				</div>
			</div>
		{/if}

		<div class="py-3 border-b border-gray-100">
			<p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">通知設定</p>
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-800">Push通知</p>
					<p class="text-xs text-gray-400 mt-0.5">新着通知をプッシュ通知で受け取る</p>
				</div>
				<button
					onclick={togglePush}
					disabled={pushLoading}
					class="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none
						{pushEnabled ? 'bg-[#0085ff]' : 'bg-gray-200'}
						disabled:opacity-50"
					role="switch"
					aria-checked={pushEnabled}
					aria-label="Push通知"
				>
					<span
						class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200
							{pushEnabled ? 'translate-x-6' : 'translate-x-0'}"
					></span>
				</button>
			</div>
		</div>

		<div class="py-3 border-b border-gray-100">
			<p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">アカウント</p>
			<button
				onclick={handleLogout}
				class="w-full text-left py-2 text-sm font-medium text-red-500"
			>
				ログアウト
			</button>
		</div>

		<div class="py-3">
			<p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">SkyPutterについて</p>
			<div class="space-y-2 text-sm text-gray-600">
				<p>しずか、でもとどく</p>
				<p class="text-xs text-gray-400">Version 0.1.0 · suibari</p>
				<p class="text-xs text-gray-400">Blueskyへのアウトプット専用PWA。タイムラインは持たず、投稿・自分の投稿一覧・通知・下書きに機能を絞る。インプット過多による消耗を防ぎ、アウトプットに集中するためのアプリ。</p>
			</div>
		</div>

		<div class="py-8 flex justify-center">
			<img src="/skyputter_logo.png" alt="SkyPutter" class="h-8 object-contain opacity-50" />
		</div>
	</div>
</div>
