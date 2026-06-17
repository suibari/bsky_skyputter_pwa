import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { loadSession, isAuthenticated } from '$lib/stores/auth.svelte';

export const ssr = false;
export const prerender = false;

export function load({ url }: { url: URL }) {
	if (!browser) return {};

	loadSession();

	const isLoginPage = url.pathname === '/login';
	const isOAuthCallback = url.pathname === '/oauth/callback';

	if (!isAuthenticated() && !isLoginPage && !isOAuthCallback) {
		redirect(302, '/login');
	}
	if (isAuthenticated() && isLoginPage) {
		redirect(302, '/post');
	}

	return {};
}
