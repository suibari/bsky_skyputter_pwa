import { BskyAgent } from '@atproto/api';
import { getSession, saveSession, clearSession } from '$lib/stores/auth.svelte';

export function createAgent(): BskyAgent {
	const agent = new BskyAgent({
		service: 'https://bsky.social',
		persistSession(evt, sess) {
			if (evt === 'update' && sess) {
				saveSession({
					accessJwt: sess.accessJwt,
					refreshJwt: sess.refreshJwt,
					did: sess.did,
					handle: sess.handle,
					avatar: getSession()?.avatar
				});
			} else if (evt === 'expired') {
				clearSession();
				if (typeof window !== 'undefined') {
					window.location.href = '/login';
				}
			}
		}
	});

	const session = getSession();
	if (session) {
		agent.resumeSession({
			accessJwt: session.accessJwt,
			refreshJwt: session.refreshJwt ?? '',
			did: session.did,
			handle: session.handle,
			active: true
		});
	}

	return agent;
}
