import { PUBLIC_API_URL } from '$env/static/public';
import { getSession } from '$lib/stores/auth.svelte';
import { idbSaveDraft, idbGetDraft, idbDeleteDraft } from '$lib/db/drafts-idb';
import type { Draft } from '$lib/types/draft';

function authHeaders(): Record<string, string> {
	const session = getSession();
	if (!session) throw new Error('Not authenticated');
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${session.accessJwt}`
	};
}

type ServerDraft = {
	id: string;
	text: string;
	createdAt: string;
	updatedAt: string;
};

export async function saveDraft(draft: Draft): Promise<void> {
	// テキストをサーバーへ保存
	const res = await fetch(`${PUBLIC_API_URL}/api/drafts/${draft.id}`, {
		method: 'PUT',
		headers: authHeaders(),
		body: JSON.stringify({ text: draft.text, createdAt: draft.createdAt })
	});
	if (!res.ok) throw new Error('Failed to save draft to server');

	// 画像（Blob）をIndexedDBへ保存
	await idbSaveDraft(draft);
}

export async function getDrafts(): Promise<Draft[]> {
	const res = await fetch(`${PUBLIC_API_URL}/api/drafts`, {
		headers: authHeaders()
	});
	if (!res.ok) throw new Error('Failed to fetch drafts');

	const { drafts: serverDrafts } = (await res.json()) as { drafts: ServerDraft[] };

	// サーバーのテキストとIndexedDBの画像をマージ
	return Promise.all(
		serverDrafts.map(async (sd) => {
			const local = await idbGetDraft(sd.id);
			return {
				id: sd.id,
				text: sd.text,
				images: local?.images ?? [],
				createdAt: sd.createdAt,
				updatedAt: sd.updatedAt
			};
		})
	);
}

export async function getDraft(id: string): Promise<Draft | undefined> {
	const res = await fetch(`${PUBLIC_API_URL}/api/drafts/${id}`, {
		headers: authHeaders()
	});
	if (res.status === 404) return undefined;
	if (!res.ok) throw new Error('Failed to fetch draft');

	const sd = (await res.json()) as ServerDraft;
	const local = await idbGetDraft(id);
	return {
		id: sd.id,
		text: sd.text,
		images: local?.images ?? [],
		createdAt: sd.createdAt,
		updatedAt: sd.updatedAt
	};
}

export async function deleteDraft(id: string): Promise<void> {
	const res = await fetch(`${PUBLIC_API_URL}/api/drafts/${id}`, {
		method: 'DELETE',
		headers: authHeaders()
	});
	if (!res.ok) throw new Error('Failed to delete draft');

	await idbDeleteDraft(id);
}
