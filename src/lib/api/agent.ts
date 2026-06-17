import { Agent, BskyAgent } from '@atproto/api';
import { oauthClient } from '$lib/stores/oauth-client';
import { getSession, saveSession, clearSession } from '$lib/stores/auth.svelte';

export async function createAgent(): Promise<Agent> {
	const session = getSession();
	if (!session) throw new Error('Not authenticated');

	if (session.type === 'oauth') {
		try {
			const oauthSession = await oauthClient.restore(session.did);
			return new Agent(oauthSession);
		} catch {
			clearSession();
			if (typeof window !== 'undefined') window.location.href = '/login';
			throw new Error('OAuth session expired. Please sign in again.');
		}
	}

	// App Password
	const agent = new BskyAgent({
		service: 'https://bsky.social',
		persistSession(evt, sess) {
			if (evt === 'update' && sess) {
				saveSession({
					accessJwt: sess.accessJwt,
					refreshJwt: sess.refreshJwt,
					did: sess.did,
					handle: sess.handle,
					avatar: getSession()?.avatar,
					type: 'app-password',
				});
			} else if (evt === 'expired') {
				clearSession();
				if (typeof window !== 'undefined') window.location.href = '/login';
			}
		}
	});

	await agent.resumeSession({
		accessJwt: session.accessJwt ?? '',
		refreshJwt: session.refreshJwt ?? '',
		did: session.did,
		handle: session.handle,
		active: true,
	});

	return agent;
}
