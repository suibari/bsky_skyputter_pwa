const COMPOSE_TEXT_KEY = 'skyputter_compose_text';

let text = $state('');

export function getComposeText(): string {
	return text;
}

export function setComposeText(t: string): void {
	text = t;
	if (typeof window !== 'undefined') {
		if (t) localStorage.setItem(COMPOSE_TEXT_KEY, t);
		else localStorage.removeItem(COMPOSE_TEXT_KEY);
	}
}

export function loadComposeText(): void {
	if (typeof window === 'undefined') return;
	text = localStorage.getItem(COMPOSE_TEXT_KEY) ?? '';
}

export function clearComposeText(): void {
	text = '';
	if (typeof window !== 'undefined') localStorage.removeItem(COMPOSE_TEXT_KEY);
}
