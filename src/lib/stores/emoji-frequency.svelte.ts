const STORAGE_KEY = 'skyputter_emoji_freq';

function loadFreqMap(): Record<string, number> {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

function saveFreqMap(map: Record<string, number>): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
	} catch {}
}

export function getFrequentEmojis(limit = 16): string[] {
	const map = loadFreqMap();
	return Object.entries(map)
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit)
		.map(([emoji]) => emoji);
}

export function recordEmojiUse(emoji: string): void {
	const map = loadFreqMap();
	map[emoji] = (map[emoji] ?? 0) + 1;
	saveFreqMap(map);
}
