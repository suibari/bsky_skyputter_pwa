import type { Language, Translation } from '$lib/i18n/index';
import { ja } from '$lib/i18n/ja';
import { en } from '$lib/i18n/en';

export type { Language };

const LANGUAGE_KEY = 'skyputter_language';

const translations: Record<Language, Translation> = { ja, en };

let language = $state<Language>('ja');

export function getLanguage(): Language {
	return language;
}

export function getT(): Translation {
	return translations[language];
}

export function setLanguage(lang: Language): void {
	language = lang;
	localStorage.setItem(LANGUAGE_KEY, lang);
}

export function loadLanguage(): void {
	if (typeof window === 'undefined') return;
	const saved = localStorage.getItem(LANGUAGE_KEY) as Language | null;
	if (saved === 'ja' || saved === 'en') {
		language = saved;
		return;
	}
	language = navigator.language.startsWith('ja') ? 'ja' : 'en';
}
