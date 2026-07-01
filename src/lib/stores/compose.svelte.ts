import type { OgpData } from '$lib/api/ogp';
import { idbDeleteComposeMedia, idbGetComposeMedia, idbSaveComposeMedia } from '$lib/db/drafts-idb';

const COMPOSE_TEXT_KEY = 'skyputter_compose_text';
const COMPOSE_STATE_KEY = 'skyputter_compose_state';
const COMPOSE_MEDIA_RECORD_ID = 'compose-current';

export type ComposeReplyContext = {
	uri: string;
	cid: string;
	rootUri: string;
	rootCid: string;
	text: string;
	authorHandle: string;
};

export type ComposeQuoteContext = {
	uri: string;
	cid: string;
	text: string;
	authorHandle: string;
};

export type ComposeState = {
	text: string;
	images: File[];
	video: File | null;
	replyContext: ComposeReplyContext | null;
	quoteContext: ComposeQuoteContext | null;
	ogpData: OgpData | null;
	ogpDismissed: boolean;
};

type PersistedComposeState = {
	text: string;
	replyContext: ComposeReplyContext | null;
	quoteContext: ComposeQuoteContext | null;
	ogpData: OgpData | null;
	ogpDismissed: boolean;
	hasMedia: boolean;
	updatedAt: string;
};

let text = $state('');

function isBrowser(): boolean {
	return typeof window !== 'undefined';
}

function fileFromBlob(blob: Blob, name: string): File {
	return new File([blob], name, { type: blob.type || 'application/octet-stream' });
}

function parsePersistedComposeState(value: string): PersistedComposeState | null {
	try {
		const parsed = JSON.parse(value) as Partial<PersistedComposeState>;
		if (typeof parsed.text !== 'string') return null;
		if (typeof parsed.hasMedia !== 'boolean') return null;
		if (typeof parsed.ogpDismissed !== 'boolean') return null;
		return {
			text: parsed.text,
			replyContext: parsed.replyContext ?? null,
			quoteContext: parsed.quoteContext ?? null,
			ogpData: parsed.ogpData ?? null,
			ogpDismissed: parsed.ogpDismissed,
			hasMedia: parsed.hasMedia,
			updatedAt: parsed.updatedAt ?? ''
		};
	} catch {
		return null;
	}
}

export function getComposeText(): string {
	return text;
}

export function setComposeText(t: string): void {
	text = t;
	if (isBrowser()) {
		if (t) localStorage.setItem(COMPOSE_TEXT_KEY, t);
		else localStorage.removeItem(COMPOSE_TEXT_KEY);
	}
}

export function loadComposeText(): void {
	if (!isBrowser()) return;
	text = localStorage.getItem(COMPOSE_TEXT_KEY) ?? '';
}

export function clearComposeText(): void {
	text = '';
	if (isBrowser()) localStorage.removeItem(COMPOSE_TEXT_KEY);
}

export async function saveComposeState(state: ComposeState): Promise<void> {
	text = state.text;
	if (!isBrowser()) return;

	if (state.text) localStorage.setItem(COMPOSE_TEXT_KEY, state.text);
	else localStorage.removeItem(COMPOSE_TEXT_KEY);

	const hasMedia = state.images.length > 0 || state.video !== null;
	if (hasMedia) {
		await idbSaveComposeMedia(COMPOSE_MEDIA_RECORD_ID, state.images, state.video);
	} else {
		await idbDeleteComposeMedia(COMPOSE_MEDIA_RECORD_ID);
	}

	const persisted: PersistedComposeState = {
		text: state.text,
		replyContext: state.replyContext,
		quoteContext: state.quoteContext,
		ogpData: state.ogpData,
		ogpDismissed: state.ogpDismissed,
		hasMedia,
		updatedAt: new Date().toISOString()
	};
	localStorage.setItem(COMPOSE_STATE_KEY, JSON.stringify(persisted));
}

export async function loadComposeState(): Promise<ComposeState | null> {
	if (!isBrowser()) return null;
	const raw = localStorage.getItem(COMPOSE_STATE_KEY);
	if (!raw) return null;

	const parsed = parsePersistedComposeState(raw);
	if (!parsed) {
		localStorage.removeItem(COMPOSE_STATE_KEY);
		return null;
	}

	let images: File[] = [];
	let video: File | null = null;
	if (parsed.hasMedia) {
		const media = await idbGetComposeMedia(COMPOSE_MEDIA_RECORD_ID);
		images = media.images.map((blob, i) => fileFromBlob(blob, `compose-image-${i}.${blob.type.split('/')[1] ?? 'bin'}`));
		video = media.video ? fileFromBlob(media.video, `compose-video.${media.video.type.split('/')[1] ?? 'bin'}`) : null;
	}

	text = parsed.text;
	return {
		text: parsed.text,
		images,
		video,
		replyContext: parsed.replyContext,
		quoteContext: parsed.quoteContext,
		ogpData: parsed.ogpData,
		ogpDismissed: parsed.ogpDismissed
	};
}

export async function clearComposeState(): Promise<void> {
	text = '';
	if (!isBrowser()) return;
	localStorage.removeItem(COMPOSE_TEXT_KEY);
	localStorage.removeItem(COMPOSE_STATE_KEY);
	await idbDeleteComposeMedia(COMPOSE_MEDIA_RECORD_ID);
}
