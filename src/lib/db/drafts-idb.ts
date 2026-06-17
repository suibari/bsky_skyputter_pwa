import { openDB, type IDBPDatabase } from 'idb';
import type { Draft } from '$lib/types/draft';

const DB_NAME = 'skyputter';
const STORE_NAME = 'drafts';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
	if (!dbPromise) {
		dbPromise = openDB(DB_NAME, DB_VERSION, {
			upgrade(db) {
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
					store.createIndex('updatedAt', 'updatedAt');
				}
			}
		});
	}
	return dbPromise;
}

export async function idbSaveDraft(draft: Draft): Promise<void> {
	const db = await getDB();
	await db.put(STORE_NAME, draft);
}

export async function idbGetDraft(id: string): Promise<Draft | undefined> {
	const db = await getDB();
	return db.get(STORE_NAME, id);
}

export async function idbDeleteDraft(id: string): Promise<void> {
	const db = await getDB();
	await db.delete(STORE_NAME, id);
}
