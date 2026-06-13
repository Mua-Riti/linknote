import { openDB, IDBPDatabase } from 'idb';
import type { NoteDB } from '../types';

const DB_NAME = 'linknote-db';
const DB_VERSION = 1;
const NOTE_STORE = 'notes';

let dbInstance: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(NOTE_STORE)) {
        const store = db.createObjectStore(NOTE_STORE, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
        store.createIndex('createdAt', 'createdAt');
        store.createIndex('title', 'title');
      }
    },
  });

  return dbInstance;
}

// ========== CRUD 操作 ==========

export async function getAllNotes(): Promise<NoteDB[]> {
  const db = await getDB();
  const notes = await db.getAll(NOTE_STORE);
  // 按更新时间降序排列
  return notes.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNoteById(id: string): Promise<NoteDB | undefined> {
  const db = await getDB();
  return db.get(NOTE_STORE, id);
}

export async function putNote(note: NoteDB): Promise<void> {
  const db = await getDB();
  await db.put(NOTE_STORE, note);
}

export async function deleteNoteFromDB(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(NOTE_STORE, id);
}

export async function getStorageEstimate(): Promise<{ usage: number; quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    };
  }
  return { usage: 0, quota: 0 };
}

export async function clearAllNotes(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(NOTE_STORE, 'readwrite');
  await tx.store.clear();
  await tx.done;
}

// ========== 生成唯一 ID ==========
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
