import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { PUBLIC_API_URL } from '$env/static/public';
import { loadSession, saveSession, getSession, isAuthenticated } from '$lib/stores/auth.svelte';
import { oauthClient } from '$lib/stores/oauth-client';

export const ssr = false;
export const prerender = false;

export async function load({ url }: { url: URL }) {
	if (!browser) return {};

	// OAuth セッションの復元（コールバック処理も兼ねる）
	const oauthResult = await oauthClient.init().catch(() => undefined);
	if (oauthResult) {
		const { session } = oauthResult;
		const current = getSession();
		if (!current || current.did !== session.did || current.type !== 'oauth') {
			// 新規 OAuth セッション: プロフィール取得してローカルに保存
			const profileRes = await fetch(
				`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(session.did)}`
			).catch(() => null);
			const profile = profileRes?.ok
				? (await profileRes.json()) as { handle: string; avatar?: string }
				: null;
			saveSession({
				did: session.did,
				handle: profile?.handle ?? session.did,
				avatar: profile?.avatar,
				type: 'oauth',
			});
			// Jetstream 登録
			if (profile) {
				fetch(`${PUBLIC_API_URL}/api/auth/register`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ did: session.did, handle: profile.handle }),
				}).catch(() => {});
			}
		}
		// OAuth セッションがあれば既存の loadSession は不要（型情報は上で保存済み）
		if (!getSession()) loadSession();
	} else {
		// App Password セッションを localStorage から復元
		loadSession();
	}

	const isPublicPath = url.pathname === '/login' || url.pathname === '/oauth/callback';

	if (!isAuthenticated() && !isPublicPath) {
		redirect(302, '/login');
	}
	if (isAuthenticated() && url.pathname === '/login') {
		redirect(302, '/post');
	}

	return {};
}
