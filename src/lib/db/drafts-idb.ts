import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'skyputter';
const STORE_NAME = 'drafts';
const DB_VERSION = 2;

type DraftImages = { id: string; images: Blob[] };

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
	if (!dbPromise) {
		dbPromise = openDB(DB_NAME, DB_VERSION, {
			upgrade(db, oldVersion) {
				if (oldVersion < 1) {
					const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
					store.createIndex('updatedAt', 'updatedAt');
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
