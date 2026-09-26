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

describe("sendOrThrow — the unverified-sender safety net", () => {
  const withEnv = async (env: Record<string, string | undefined>, fn: () => Promise<void>) => {
    const saved = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
    for (const [k, v] of Object.entries(env)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    try {
      await fn();
    } finally {
      for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
      }
    }
  };
  /** Rejects any send from the given domain, the way Resend does. */
  const rejecting = (badDomain: string, calls: Array<{ from: string; key?: string }>) =>
    ({
      emails: {
        send: async (m: { from: string }, o?: { idempotencyKey?: string }) => {
          calls.push({ from: m.from, key: o?.idempotencyKey });
          return m.from.includes(badDomain)
            ? { data: null, error: { name: "validation_error", message: `The ${badDomain} domain is not verified.` } }
            : { data: { id: "ok" }, error: null };
        },
      },
    }) as unknown as Resend;

  it("resends a rejected MySchoolFrame sender ONCE from the working address, with its own key", async () => {
    await withEnv(
      { MSF_EMAIL_FROM: "MySchoolFrame <orders@myschoolframe.com>", EMAIL_FROM: "Festive Frames <orders@festiveframes.co>" },
      async () => {
        const calls: Array<{ from: string; key?: string }> = [];
        const r = await sendOrThrow(rejecting("myschoolframe.com", calls), { from: "MySchoolFrame <orders@myschoolframe.com>" } as never, { idempotencyKey: "k1" });
        expect(r).toEqual({ id: "ok" });
        expect(calls).toEqual([
          { from: "MySchoolFrame <orders@myschoolframe.com>", key: "k1" },
          { from: "MySchoolFrame <orders@festiveframes.co>", key: "k1/fallback-sender" },
        ]);
      },
    );
  });

  it("does NOT retry any other sender, or any other kind of error", async () => {
    await withEnv({ MSF_EMAIL_FROM: "MySchoolFrame <orders@myschoolframe.com>", EMAIL_FROM: "Festive Frames <orders@festiveframes.co>" }, async () => {
      const calls: Array<{ from: string; key?: string }> = [];
      await expect(sendOrThrow(rejecting("example.org", calls), { from: "Someone <a@example.org>" } as never)).rejects.toThrow(/not verified/);
      expect(calls).toHaveLength(1);
      await expect(
        sendOrThrow(fake({ data: null, error: { name: "rate_limit_exceeded", message: "slow down" } }), { from: "MySchoolFrame <orders@myschoolframe.com>" } as never),
      ).rejects.toThrow("slow down");
    });
  });

  it("with no MySchoolFrame sender configured there is nothing to fall back from", async () => {
    await withEnv({ MSF_EMAIL_FROM: undefined, EMAIL_FROM: "Festive Frames <orders@festiveframes.co>" }, async () => {
      const calls: Array<{ from: string; key?: string }> = [];
      await expect(sendOrThrow(rejecting("festiveframes.co", calls), { from: "MySchoolFrame <orders@festiveframes.co>" } as never)).rejects.toThrow();
      expect(calls).toHaveLength(1);
    });
  });
});
