import { createAgent } from './agent';
import { idbSaveDraftImages, idbGetDraftImages, idbDeleteDraftImages } from '$lib/db/drafts-idb';
import type { Draft } from '$lib/types/draft';

export async function saveDraft(draft: Draft): Promise<string> {
	const agent = createAgent();
	const draftPayload = { posts: [{ text: draft.text }] };

	let id: string;
	if (draft.id) {
		await agent.api.app.bsky.draft.updateDraft({
			draft: { id: draft.id, draft: draftPayload }
		});
		id = draft.id;
	} else {
		const res = await agent.api.app.bsky.draft.createDraft({ draft: draftPayload });
		id = res.data.id;
	}

	await idbSaveDraftImages(id, draft.images);
	return id;
}

export async function getDrafts(): Promise<Draft[]> {
	const agent = createAgent();
	const res = await agent.api.app.bsky.draft.getDrafts({ limit: 100 });
	return Promise.all(
		res.data.drafts.map(async (dv) => ({
			id: dv.id,
			text: dv.draft.posts[0]?.text ?? '',
			images: await idbGetDraftImages(dv.id),
			createdAt: dv.createdAt,
			updatedAt: dv.updatedAt
		}))
	);
}

export async function getDraft(id: string): Promise<Draft | undefined> {
	const drafts = await getDrafts();
	return drafts.find((d) => d.id === id);
}

export async function deleteDraft(id: string): Promise<void> {
	const agent = createAgent();
	await agent.api.app.bsky.draft.deleteDraft({ id });
	await idbDeleteDraftImages(id);
}
