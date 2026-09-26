import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Resend } from "resend";
import { sendOrThrow } from "./resend-send";

const fake = (result: unknown) => ({ emails: { send: async () => result } }) as unknown as Resend;

describe("sendOrThrow", () => {
  it("returns the id of a delivered email", async () => {
    expect(await sendOrThrow(fake({ data: { id: "e1" }, error: null }), {} as never)).toEqual({ id: "e1" });
  });

  it("THROWS on a rejected send — Resend v6 returns the error instead of throwing it", async () => {
    await expect(
      sendOrThrow(fake({ data: null, error: { name: "validation_error", message: "domain not verified" } }), {} as never),
    ).rejects.toThrow("Resend validation_error: domain not verified");
  });

  // The guard that keeps the fix fixed: every catch block around a send assumes a
  // failed send throws, which is only true through this helper.
  it("is the only place in src that calls .emails.send(", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !p.endsWith("resend-send.ts")) {
          if (/\.emails\.send\(/.test(readFileSync(p, "utf8"))) offenders.push(p);
        }
      }
    };
    walk(join(process.cwd(), "src"));
    expect(offenders).toEqual([]);
  });
});

