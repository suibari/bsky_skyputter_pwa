import type { Session } from '$lib/types/auth';

const SESSION_KEY = 'skyputter_session';

let session = $state<Session | null>(null);

export function getSession(): Session | null {
	return session;
}

export function isAuthenticated(): boolean {
	return session !== null;
}

export function loadSession(): boolean {
	if (typeof window === 'undefined') return false;
	const raw = localStorage.getItem(SESSION_KEY);
	if (!raw) return false;
	try {
		session = JSON.parse(raw) as Session;
		return true;
	} catch {
		return false;
	}
}

export function saveSession(s: Session): void {
	session = s;
	localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

export function clearSession(): void {
	session = null;
	localStorage.removeItem(SESSION_KEY);
}

export function cacheAvatar(avatar: string): void {
	if (!session || session.avatar === avatar) return;
	saveSession({ ...session, avatar });
}
