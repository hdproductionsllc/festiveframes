// ─── Full-resolution image store (IndexedDB) ─────────────────────────────────
//
// A print-resolution mascot/photo crop is far too large to live in the persisted
// zustand blob: base64 print art × four panels blows localStorage's ~5 MB quota
// (the very overflow that raises SchoolDesigner's "storage is full" banner). So we
// SPLIT storage: a small (<=1200 px) preview data URL stays in the persisted design
// (enough to render on screen), and the full-resolution cropped ORIGINAL is stored
// here in IndexedDB — a much larger, blob-native quota — keyed by an id. The design
// carries only that id; the heavy bytes never touch localStorage.
//
// The full-res blob is fetched from here only when it's actually needed (export, or
// a future server upload). On a normal design load the preview alone renders the
// frame, so this store is never even opened.
//
// Testability: the IndexedDB plumbing sits behind a tiny BlobBackend, so the store's
// logic round-trips a blob through an in-memory backend in unit tests without a DOM,
// while production uses the real IndexedDB backend below.

const DB_NAME = "festive-frames-images";
const STORE_NAME = "fullres";
const DB_VERSION = 1;

/** The minimal async key→blob contract the store needs. */
export interface BlobBackend {
  put(id: string, blob: Blob): Promise<void>;
  get(id: string): Promise<Blob | null>;
  delete(id: string): Promise<void>;
}

export interface ImageStore {
  /** Store a full-res blob under `id` (caller mints the id, e.g. crypto.randomUUID). */
  putFullRes(id: string, blob: Blob): Promise<void>;
  /** Fetch a stored blob, or null if it's absent / storage is unavailable. */
  getFullRes(id: string): Promise<Blob | null>;
  /** Remove a stored blob (called when an image is replaced or cleared). */
  deleteFullRes(id: string): Promise<void>;
}

export function createImageStore(backend: BlobBackend): ImageStore {
  return {
    putFullRes: (id, blob) => backend.put(id, blob),
    getFullRes: (id) => backend.get(id),
    deleteFullRes: (id) => backend.delete(id),
  };
}

// ── IndexedDB backend ─────────────────────────────────────────────────────────
// Every path is guarded: on the server, in a locked-down browser, or in private
// mode where IndexedDB can throw on open, we degrade to a no-op (get → null) rather
// than crash the builder. Losing the full-res cache is recoverable — the preview
// still renders and the user can re-upload — so a storage failure must never take
// the design down with it.

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

/** Run `fn` inside a transaction on the object store, resolving the request. */
function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const transaction = db.transaction(STORE_NAME, mode);
          const request = fn(transaction.objectStore(STORE_NAME));
          request.onsuccess = () => resolve(request.result ?? null);
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

const indexedDbBackend: BlobBackend = {
  put: (id, blob) => tx("readwrite", (s) => s.put(blob, id)).then(() => undefined),
  get: (id) => tx<Blob>("readonly", (s) => s.get(id)),
  delete: (id) => tx("readwrite", (s) => s.delete(id)).then(() => undefined),
};

/** The production store, backed by IndexedDB. */
export const imageStore: ImageStore = createImageStore(indexedDbBackend);

export const putFullRes = imageStore.putFullRes;
export const getFullRes = imageStore.getFullRes;
export const deleteFullRes = imageStore.deleteFullRes;
