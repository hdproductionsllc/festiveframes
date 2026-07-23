import { describe, it, expect } from "vitest";
import { makeZip, dataUrlToBytes } from "./zip";

const bytes = (s: string) => new TextEncoder().encode(s);

describe("makeZip (STORE-method archive)", () => {
  it("starts with a local-file-header signature and ends with EOCD", async () => {
    const buf = new Uint8Array(await makeZip([{ name: "a.txt", data: bytes("hi") }]).arrayBuffer());
    // Local file header PK\x03\x04
    expect([buf[0], buf[1], buf[2], buf[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    // End of central directory PK\x05\x06 — last 22 bytes (no archive comment).
    const eocd = buf.slice(buf.length - 22, buf.length - 18);
    expect([...eocd]).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });

  it("records the right number of entries in the EOCD", async () => {
    const buf = new Uint8Array(
      await makeZip([
        { name: "a.txt", data: bytes("hi") },
        { name: "b.bin", data: new Uint8Array([1, 2, 3]) },
      ]).arrayBuffer(),
    );
    const eocdStart = buf.length - 22;
    const totalEntries = buf[eocdStart + 10] | (buf[eocdStart + 11] << 8);
    expect(totalEntries).toBe(2);
  });

  it("STORES payloads verbatim (no compression) and includes the filenames", async () => {
    const buf = new Uint8Array(
      await makeZip([{ name: "left.png", data: bytes("PANEL-DATA") }]).arrayBuffer(),
    );
    const text = new TextDecoder().decode(buf);
    expect(text).toContain("left.png");
    expect(text).toContain("PANEL-DATA"); // verbatim → STORE, not deflated
  });
});

describe("dataUrlToBytes", () => {
  it("decodes a base64 data URL to its raw bytes", () => {
    expect([...dataUrlToBytes("data:image/png;base64,aGk=")]).toEqual([...bytes("hi")]);
  });
});
