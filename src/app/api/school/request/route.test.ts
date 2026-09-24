import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Capture what the email stack is asked to send WITHOUT hitting Resend. The
// alert helper instantiates `new Resend(key)` at call time, so this intercepts
// every send — same shape as the /api/school/submit route test.
const sendMock = vi.fn().mockResolvedValue({ id: "mock-id" });
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

import { POST } from "./route";
import { __memSchoolRequestsForTest } from "@/lib/school-requests";

function req(body: unknown): Request {
  return new Request("http://localhost:3000/api/school/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const GOOD = { schoolName: "Cedar Ridge High School", city: "Cedar Ridge", state: "CA" };

const ENV_KEYS = ["RESEND_API_KEY", "MSF_ORDER_EMAIL", "MSF_EMAIL_FROM", "EMAIL_FROM"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  sendMock.mockClear();
  __memSchoolRequestsForTest.clear();
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("POST /api/school/request — the store", () => {
  it("records the request and hands back its id", async () => {
    const res = await POST(req(GOOD));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; id: string };
    expect(json.ok).toBe(true);
    const row = __memSchoolRequestsForTest.get(json.id);
    expect(row).toMatchObject({
      schoolName: "Cedar Ridge High School",
      city: "Cedar Ridge",
      state: "CA",
      email: null,
      note: null,
    });
  });

  it("keeps an email and a note when they are given", async () => {
    const res = await POST(
      req({ ...GOOD, email: "parent@example.com", note: "Class of 2027, two kids there." }),
    );
    const { id } = (await res.json()) as { id: string };
    expect(__memSchoolRequestsForTest.get(id)).toMatchObject({
      email: "parent@example.com",
      note: "Class of 2027, two kids there.",
    });
  });

  it("upper-cases the state and strips control characters from the name", async () => {
    const res = await POST(req({ ...GOOD, schoolName: "Cedar\nRidge\tHigh", state: "ca" }));
    const { id } = (await res.json()) as { id: string };
    expect(__memSchoolRequestsForTest.get(id)).toMatchObject({
      schoolName: "Cedar Ridge High",
      state: "CA",
    });
  });
});

describe("POST /api/school/request — validation", () => {
  it("rejects a body that is not JSON", async () => {
    const res = await POST(
      new Request("http://localhost:3000/api/school/request", { method: "POST", body: "{" }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects a missing or one-character school name", async () => {
    expect((await POST(req({ ...GOOD, schoolName: "" }))).status).toBe(400);
    expect((await POST(req({ ...GOOD, schoolName: "X" }))).status).toBe(400);
  });

  it("rejects a missing city", async () => {
    expect((await POST(req({ ...GOOD, city: "" }))).status).toBe(400);
  });

  it("rejects a state that is not a postal code", async () => {
    // "XX" is two letters and is not a place; a regex alone would have taken it.
    for (const state of ["XX", "Missouri", "M", ""]) {
      expect((await POST(req({ ...GOOD, state }))).status, state).toBe(400);
    }
    // Territories ARE on the roster, so they are valid here.
    expect((await POST(req({ ...GOOD, state: "PR" }))).status).toBe(200);
  });

  it("rejects an email that is not an address", async () => {
    expect((await POST(req({ ...GOOD, email: "not-an-address" }))).status).toBe(400);
  });

  it("stores nothing when validation fails", async () => {
    await POST(req({ ...GOOD, state: "XX" }));
    expect(__memSchoolRequestsForTest.size).toBe(0);
  });
});

describe("POST /api/school/request — mail", () => {
  it("alerts MySchoolFrame's own inbox by default (bill@myschoolframe.com), from MySchoolFrame", async () => {
    process.env.RESEND_API_KEY = "test-key";
    delete process.env.MSF_ORDER_EMAIL;
    delete process.env.MSF_EMAIL_FROM;
    process.env.EMAIL_FROM = "Shared <orders@verified.example>";
    const res = await POST(req({ ...GOOD, email: "parent@example.com" }));
    expect(res.status).toBe(200);
    expect(sendMock).toHaveBeenCalledTimes(1);
    const sent = sendMock.mock.calls[0][0] as { to: string[]; from: string };
    expect(sent.to).toEqual(["bill@myschoolframe.com"]);
    expect(sent.from).toBe("MySchoolFrame <orders@verified.example>");
  });

  it("alerts US and only us when MSF_ORDER_EMAIL is set", async () => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.MSF_ORDER_EMAIL = "henry@example.com, bill@example.com";
    await POST(req({ ...GOOD, email: "parent@example.com" }));
    expect(sendMock).toHaveBeenCalledTimes(1);
    const sent = sendMock.mock.calls[0][0] as { to: string[]; subject: string; text: string };
    expect(sent.to).toEqual(["henry@example.com", "bill@example.com"]);
    // THE RULE: the requester is never a recipient. Their address appears in the
    // body so a human can choose to reply; it must never be in `to`.
    expect(sent.to).not.toContain("parent@example.com");
    expect(sent.subject).toContain("Cedar Ridge High School");
    expect(sent.text).toContain("parent@example.com");
  });

  it("still records the request when there is no Resend key", async () => {
    delete process.env.RESEND_API_KEY;
    process.env.MSF_ORDER_EMAIL = "henry@example.com";
    const res = await POST(req(GOOD));
    expect(res.status).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
    expect(__memSchoolRequestsForTest.size).toBe(1);
  });
});
