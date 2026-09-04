/**
 * Minimal IndexedDB wrapper used for genuine offline operation:
 *  • "queue"  — field incident reports captured with no connectivity
 *  • "tiles"  — downloaded NER map tiles (bounded area + zoom range)
 *  • "cache"  — last known routes / corridor status so the app stays usable offline
 */

const DB_NAME = "ner-route-ai";
const DB_VERSION = 1;
export type StoreName = "queue" | "tiles" | "cache";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB unavailable"));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "id" });
        if (!db.objectStoreNames.contains("tiles")) db.createObjectStore("tiles");
        if (!db.objectStoreNames.contains("cache")) db.createObjectStore("cache");
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const idbGet = <T>(store: StoreName, key: IDBValidKey) => tx<T | undefined>(store, "readonly", (s) => s.get(key));
export const idbPut = (store: StoreName, value: unknown, key?: IDBValidKey) =>
  tx<IDBValidKey>(store, "readwrite", (s) => (key === undefined ? s.put(value) : s.put(value, key)));
export const idbDelete = (store: StoreName, key: IDBValidKey) => tx<undefined>(store, "readwrite", (s) => s.delete(key));
export const idbAll = <T>(store: StoreName) => tx<T[]>(store, "readonly", (s) => s.getAll());
export const idbCount = (store: StoreName) => tx<number>(store, "readonly", (s) => s.count());
export const idbClear = (store: StoreName) => tx<undefined>(store, "readwrite", (s) => s.clear());
