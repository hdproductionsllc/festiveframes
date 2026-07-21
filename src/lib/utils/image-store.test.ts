import { describe, it, expect } from "vitest";
import { createImageStore, imageStore, type BlobBackend } from "./image-store";

/** In-memory backend standing in for IndexedDB, so the store's put/get/delete
 *  contract round-trips a real blob without a DOM. */
function memoryBackend(): BlobBackend {
  const map = new Map<string, Blob>();
  return {
    put: async (id, blob) => void map.set(id, blob),
    get: async (id) => map.get(id) ?? null,
    delete: async (id) => void map.delete(id),
  };
}

describe("createImageStore", () => {
  it("round-trips a blob by id", async () => {
    const store = createImageStore(memoryBackend());
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" });
    await store.putFullRes("abc", blob);
    const got = await store.getFullRes("abc");
    expect(got).not.toBeNull();
    expect(got!.size).toBe(4);
    expect(got!.type).toBe("image/png");
  });

  it("returns null for an unknown id", async () => {
    const store = createImageStore(memoryBackend());
    expect(await store.getFullRes("missing")).toBeNull();
  });

  it("deletes a stored blob", async () => {
    const store = createImageStore(memoryBackend());
    const blob = new Blob(["x"]);
    await store.putFullRes("k", blob);
    expect(await store.getFullRes("k")).not.toBeNull();
    await store.deleteFullRes("k");
    expect(await store.getFullRes("k")).toBeNull();
  });

  it("keeps ids isolated", async () => {
    const store = createImageStore(memoryBackend());
    await store.putFullRes("a", new Blob(["aa"]));
    await store.putFullRes("b", new Blob(["bbbb"]));
    expect((await store.getFullRes("a"))!.size).toBe(2);
    expect((await store.getFullRes("b"))!.size).toBe(4);
  });

  it("degrades to null (never throws) when IndexedDB is unavailable", async () => {
    // The vitest env is `node` — no `indexedDB` global — so the production store
    // must return null rather than crash. This exercises the guard in openDb/tx.
    expect(typeof indexedDB).toBe("undefined");
    await expect(imageStore.getFullRes("whatever")).resolves.toBeNull();
    await expect(imageStore.putFullRes("x", new Blob(["y"]))).resolves.toBeUndefined();
    await expect(imageStore.deleteFullRes("x")).resolves.toBeUndefined();
  });
});
