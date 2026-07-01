import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'skyputter';
const STORE_NAME = 'drafts';
const COMPOSE_STORE_NAME = 'compose-media';
const DB_VERSION = 3;

type DraftImages = { id: string; images: Blob[] };
type ComposeMedia = { id: string; images: Blob[]; video: Blob | null };

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
	if (!dbPromise) {
		dbPromise = openDB(DB_NAME, DB_VERSION, {
			upgrade(db, oldVersion) {
				if (oldVersion < 1) {
					const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
					store.createIndex('updatedAt', 'updatedAt');
				}
				if (oldVersion < 3) {
					db.createObjectStore(COMPOSE_STORE_NAME, { keyPath: 'id' });
				}
			}
		});
	}
	return dbPromise;
}

export async function idbSaveDraftImages(id: string, images: Blob[]): Promise<void> {
	const db = await getDB();
	await db.put(STORE_NAME, { id, images } satisfies DraftImages);
}

export async function idbGetDraftImages(id: string): Promise<Blob[]> {
	const db = await getDB();
	const record = await db.get(STORE_NAME, id) as DraftImages | undefined;
	return record?.images ?? [];
}

export async function idbDeleteDraftImages(id: string): Promise<void> {
	const db = await getDB();
	await db.delete(STORE_NAME, id);
}

export async function idbSaveComposeMedia(id: string, images: Blob[], video: Blob | null): Promise<void> {
	const db = await getDB();
	await db.put(COMPOSE_STORE_NAME, { id, images, video } satisfies ComposeMedia);
}

export async function idbGetComposeMedia(id: string): Promise<{ images: Blob[]; video: Blob | null }> {
	const db = await getDB();
	const record = await db.get(COMPOSE_STORE_NAME, id) as ComposeMedia | undefined;
	return { images: record?.images ?? [], video: record?.video ?? null };
}

export async function idbDeleteComposeMedia(id: string): Promise<void> {
	const db = await getDB();
	await db.delete(COMPOSE_STORE_NAME, id);
}
