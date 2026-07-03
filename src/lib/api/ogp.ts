export type OgpData = {
	uri: string;
	title: string;
	description: string;
	thumb?: string;
};

function parseMeta(html: string, property: string): string {
	const match =
		html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ??
		html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'));
	return match?.[1] ?? '';
}

function normalizeHttpUrl(value: string | undefined): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	if (!trimmed) return null;
	try {
		const parsed = new URL(trimmed);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
	} catch {
		return null;
	}
}

async function fetchDirect(url: string): Promise<OgpData | null> {
	const normalizedUrl = normalizeHttpUrl(url);
	if (!normalizedUrl) return null;

	const res = await fetch(url, { mode: 'cors' });
	if (!res.ok) return null;
	const html = await res.text();
	const title = parseMeta(html, 'og:title') || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
	if (!title) return null;
	return {
		uri: normalizedUrl,
		title: title.trim(),
		description: parseMeta(html, 'og:description').trim(),
		thumb: parseMeta(html, 'og:image') || undefined
	};
}

async function fetchViaCardyb(url: string): Promise<OgpData | null> {
	const fallbackUrl = normalizeHttpUrl(url);
	if (!fallbackUrl) return null;

	const res = await fetch(`https://cardyb.bsky.app/v1/extract?url=${encodeURIComponent(url)}`);
	if (!res.ok) return null;
	const json = await res.json() as { url?: string; title?: string; description?: string; image?: string; error?: string };
	if (json.error || !json.title) return null;
	return {
		uri: normalizeHttpUrl(json.url) ?? fallbackUrl,
		title: json.title.trim(),
		description: (json.description ?? '').trim(),
		thumb: json.image || undefined
	};
}

export async function fetchOgp(url: string): Promise<OgpData | null> {
	try {
		const direct = await fetchDirect(url);
		if (direct) return direct;
	} catch {
		// CORS or network error — fall through to cardyb
	}
	try {
		return await fetchViaCardyb(url);
	} catch {
		return null;
	}
}
