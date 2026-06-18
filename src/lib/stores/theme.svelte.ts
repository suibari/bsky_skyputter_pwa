export type Theme = 'system' | 'light' | 'dark';

const THEME_KEY = 'skyputter_theme';

let theme = $state<Theme>('system');

export function getTheme(): Theme {
	return theme;
}

export function isDark(): boolean {
	if (theme === 'dark') return true;
	if (theme === 'light') return false;
	return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function setTheme(t: Theme): void {
	theme = t;
	localStorage.setItem(THEME_KEY, t);
	applyTheme();
}

export function loadTheme(): void {
	if (typeof window === 'undefined') return;
	const saved = localStorage.getItem(THEME_KEY) as Theme | null;
	theme = saved ?? 'system';
	applyTheme();
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);
}

function applyTheme(): void {
	if (typeof document === 'undefined') return;
	document.documentElement.classList.toggle('dark', isDark());
}
