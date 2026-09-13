import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  ARTWORK_TAKEDOWN_EMAIL,
  UPLOAD_RIGHTS,
  UPLOAD_RIGHTS_TERMS,
  UPLOAD_RIGHTS_VERSION,
} from "./upload-rights";

// ─── One statement of the rule ───────────────────────────────────────────────
//
// The deal a parent agrees to at the upload gate and the deal the terms page
// describes have to be the same words. The only way to guarantee that is for both
// to render the SAME constant, so these tests check the surfaces actually do —
// a second copy of the promise, pasted into a page, is the failure they exist to
// catch, and it is a failure nothing else in the build would notice.

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");

describe("the attestation has one home", () => {
  it("is rendered by the terms page from the shared constant", () => {
    const terms = read("../app/(site)/terms/page.tsx");
    expect(terms).toContain("UPLOAD_RIGHTS_TERMS");
    expect(terms).toContain("ARTWORK_TAKEDOWN_EMAIL");
  });

  it("is rendered by the upload gate from the shared constant", () => {
    const gate = read("../components/designer/UploadRightsGate.tsx");
    expect(gate).toContain("UPLOAD_RIGHTS");
    expect(gate).toContain("ARTWORK_TAKEDOWN_EMAIL");
  });

  it("is not re-typed into the terms page as prose", () => {
    // The exact sentence the customer ticks must exist in one place. If it ever
    // appears literally in a page, the two can drift and only a human comparing
    // them would ever know.
    const terms = read("../app/(site)/terms/page.tsx");
    expect(terms).not.toContain(UPLOAD_RIGHTS.checkbox);
  });
});

describe("the words themselves", () => {
  it("asks the customer to own the responsibility, in the first person", () => {
    // A checkbox phrased about the company ("Festive Frames is not liable") is not
    // an attestation; this one has to be a statement the customer makes.
    expect(UPLOAD_RIGHTS.checkbox).toMatch(/^I have the right/);
    expect(UPLOAD_RIGHTS.checkbox).toMatch(/responsible/i);
  });

  it("warns about school marks specifically, since that is what this product invites", () => {
    const body = UPLOAD_RIGHTS.body.join(" ").toLowerCase();
    expect(body).toMatch(/logo|mascot/);
    expect(body).toMatch(/school/);
  });

  it("promises in the terms that uploads stay on the uploader's own frame", () => {
    // The rule that keeps the attestation meaningful: the moment one parent's
    // upload is served to another parent it becomes OUR use of the mark.
    const terms = UPLOAD_RIGHTS_TERMS.paragraphs.join(" ").toLowerCase();
    expect(terms).toMatch(/your frame only|anyone else's frame/);
  });

  it("keeps the right to refuse a print", () => {
    expect(UPLOAD_RIGHTS_TERMS.paragraphs.join(" ")).toMatch(/decline to print|refuse/i);
  });

  it("publishes a takedown door in both places", () => {
    expect(ARTWORK_TAKEDOWN_EMAIL).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
    expect(UPLOAD_RIGHTS.takedownLead.length).toBeGreaterThan(0);
    expect(UPLOAD_RIGHTS_TERMS.takedown).toMatch(/take it down/i);
  });
});

describe("the version", () => {
  it("is date-shaped, because the question a record answers is 'what did it say then'", () => {
    expect(UPLOAD_RIGHTS_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
