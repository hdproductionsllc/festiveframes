/**
 * MySchoolFrame's own pages RENDER without the holiday brand.
 *
 * school-no-festive.test.ts reads source text for the holiday domain. That cannot
 * see a brand NAME arriving through a shared layout, a title template or a
 * metadata default — which is exactly how the warranty ended up on a page titled
 * "Returns & Refunds | Festive Frames". So this renders each page and its
 * metadata and fails on either form of the holiday brand.
 */
import { describe, it, expect } from "vitest";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Metadata } from "next";

import * as warranty from "./warranty/page";
import * as terms from "./terms/page";
import * as privacy from "./privacy/page";
import * as thanks from "./thanks/page";
import * as notFoundS from "../s/not-found";
import * as notFoundSchool from "./not-found";
import { MSF_PRIVACY_PATH, MSF_TERMS_PATH, MSF_THANKS_PATH, MSF_WARRANTY, MSF_WARRANTY_PATH } from "@/content/msf-pages";
import { SCHOOL_CONTACT_EMAIL } from "@/content/school-contact";
import { UPLOAD_RIGHTS_TERMS } from "@/content/upload-rights";

const HOLIDAY = /festive ?frames/i;

async function html(el: ReactElement | Promise<ReactElement>): Promise<string> {
  return renderToStaticMarkup(await el);
}

const PAGES: Array<[string, { metadata: Metadata }, () => ReactElement | Promise<ReactElement>]> = [
  [MSF_WARRANTY_PATH, warranty, () => createElement(warranty.default)],
  [MSF_TERMS_PATH, terms, () => createElement(terms.default)],
  [MSF_PRIVACY_PATH, privacy, () => createElement(privacy.default)],
  // No session: the "couldn't find that order" state, which never calls Stripe.
  [MSF_THANKS_PATH, thanks, () => thanks.default({ searchParams: Promise.resolve({}) })],
  ["/s (404)", notFoundS, () => createElement(notFoundS.default)],
  ["/school (404)", notFoundSchool, () => createElement(notFoundSchool.default)],
];

describe("MySchoolFrame pages carry no holiday brand", () => {
  it.each(PAGES)("%s", async (_path, mod, render) => {
    const out = await html(render());
    expect(out).not.toMatch(HOLIDAY);
    expect(out).toContain(SCHOOL_CONTACT_EMAIL);
    // The title must opt out of the root "| Festive Frames" template, and the
    // share card must not inherit the holiday brand entity.
    const title = mod.metadata.title as { absolute?: string };
    expect(title.absolute).toMatch(/MySchoolFrame$/);
    expect(mod.metadata.openGraph?.siteName).toBe("MySchoolFrame");
    expect(JSON.stringify(mod.metadata)).not.toMatch(HOLIDAY);
  });
});

describe("the warranty and terms say the same thing everywhere", () => {
  it("renders the warranty from the shared words", async () => {
    const out = await html(createElement(warranty.default));
    for (const s of [MSF_WARRANTY.term, MSF_WARRANTY.covers, MSF_WARRANTY.excludes]) {
      expect(out).toContain(s.replace(/'/g, "&#x27;"));
    }
  });

  it("publishes the upload-rights promise on MySchoolFrame's own terms", async () => {
    const out = await html(createElement(terms.default));
    expect(out).toContain(UPLOAD_RIGHTS_TERMS.heading);
    expect(out).toContain(UPLOAD_RIGHTS_TERMS.paragraphs[0].replace(/'/g, "&#x27;"));
  });
});
