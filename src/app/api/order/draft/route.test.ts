import { describe, it, expect, vi, beforeEach } from "vitest";

// The route's only side effect is the store write, so mock that and read the
// status each outcome turns into. Nothing here touches Postgres. (The factory
// forwards at CALL time — a direct reference would be hoisted above the spy.)
const saveDraft = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/order/store", () => ({
  saveDraft: (...a: unknown[]) => saveDraft(...a),
}));

import { POST } from "./route";

const BODY = {
  orderId: "ord_test_1",
  parts: { lines: [] },
  artifacts: { proof: null, printSheets: [], banners: [] },
  design: { slots: {} },
};

function req(body: unknown): Request {
  return new Request("http://localhost:3000/api/order/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  saveDraft.mockReset();
  saveDraft.mockResolvedValue(undefined);
});

describe("POST /api/order/draft", () => {
  it("stores the draft and answers 200 { ok:true }", async () => {
    const res = await POST(req(BODY));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(saveDraft).toHaveBeenCalledTimes(1);
    expect(saveDraft.mock.calls[0][0]).toMatchObject({ orderId: "ord_test_1" });
  });

  it("rejects a body missing parts/artifacts (400), without storing", async () => {
    const res = await POST(req({ orderId: "ord_test_1" }));
    expect(res.status).toBe(400);
    expect(saveDraft).not.toHaveBeenCalled();
  });

  // The defect this pins: a store failure used to answer 200 { ok:false }, and
  // the builder only read `res.ok` — so an unstored design entered the cart and
  // 409'd at checkout. The status has to carry the failure.
  it("answers 503 when the store throws, keeping the { ok:false } body", async () => {
    saveDraft.mockRejectedValue(new Error("db down"));
    const res = await POST(req(BODY));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
  });
});
