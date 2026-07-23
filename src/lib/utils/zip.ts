// Minimal, dependency-free ZIP writer (STORE method — no compression). PNGs are
// already DEFLATE-compressed internally, so storing them raw is the right call: the
// archive stays small AND we avoid pulling in a zip library + its bundle weight.
//
// Implements just enough of the ZIP spec (APPNOTE) for a browser download: a local
// file header + data per entry, a central directory, and the end-of-central-directory
// record. All fields are little-endian; sizes assume < 4 GB (fine for a few PNGs).

/** CRC-32 (IEEE 802.3), table-built once. Required in every ZIP file header. */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  /** Path inside the archive, e.g. "lincoln-hs-left.png". */
  name: string;
  data: Uint8Array;
}

/**
 * Build a ZIP archive (STORE method) from the given entries and return it as a Blob
 * ready for a browser download. Filenames are encoded UTF-8. No timestamps (all zero)
 * so the output is deterministic.
 */
export function makeZip(entries: ZipEntry[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  const u16 = (v: number) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
  const u32 = (v: number) =>
    new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    // Local file header (signature 0x04034b50) + name + data.
    const local = concat([
      u32(0x04034b50),
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method 0 = STORE
      u16(0), u16(0), // mod time / date (zeroed)
      u32(crc),
      u32(size), // compressed size (== uncompressed for STORE)
      u32(size), // uncompressed size
      u16(nameBytes.length),
      u16(0), // extra length
      nameBytes,
    ]);
    chunks.push(local, entry.data);

    // Central directory header (signature 0x02014b50).
    central.push(
      concat([
        u32(0x02014b50),
        u16(20), // version made by
        u16(20), // version needed
        u16(0), // flags
        u16(0), // method
        u16(0), u16(0), // mod time / date
        u32(crc),
        u32(size),
        u32(size),
        u16(nameBytes.length),
        u16(0), // extra length
        u16(0), // comment length
        u16(0), // disk number start
        u16(0), // internal attrs
        u32(0), // external attrs
        u32(offset), // local header offset
        nameBytes,
      ]),
    );

    offset += local.length + entry.data.length;
  }

  const centralBytes = concat(central);
  const end = concat([
    u32(0x06054b50), // end-of-central-directory signature
    u16(0), // disk number
    u16(0), // central dir disk
    u16(entries.length), // entries on this disk
    u16(entries.length), // total entries
    u32(centralBytes.length), // central dir size
    u32(offset), // central dir offset
    u16(0), // comment length
  ]);

  // Cast: these Uint8Arrays are valid BlobParts at runtime; the newer lib types are
  // over-strict about ArrayBuffer vs ArrayBufferLike (SharedArrayBuffer) backing.
  const parts = [...chunks, centralBytes, end] as unknown as BlobPart[];
  return new Blob(parts, { type: "application/zip" });
}

function concat(parts: Uint8Array[]): Uint8Array {
  let len = 0;
  for (const p of parts) len += p.length;
  const out = new Uint8Array(len);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Decode a `data:...;base64,XXXX` URL to raw bytes (for zipping a canvas PNG). */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
