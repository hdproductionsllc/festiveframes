import { describe, expect, it } from "vitest";
import { designLettering } from "./lettering";
import type { BottomBarConfig } from "@/lib/types";

const bar = (text: string, tagline?: string) => ({ text, tagline }) as unknown as BottomBarConfig;

describe("designLettering", () => {
  it("reads the section banners top to bottom, small line before big", () => {
    expect(
      designLettering({
        sections: {
          bottom: { mode: "text", text: bar("EMMA MILLER", "PROUD PARENT · 2027") },
          top: { mode: "text", text: bar("LADUE HORTON WATKINS") },
          "wing-left": { mode: "tiles" } as never,
        },
      }),
    ).toEqual(["LADUE HORTON WATKINS", "PROUD PARENT · 2027", "EMMA MILLER"]);
  });

  it("skips empty lines and non-text sections, and includes free text bars", () => {
    expect(
      designLettering({
        sections: { top: { mode: "image" } as never, bottom: { mode: "text", text: bar("  ", "") } },
        textBars: [{ config: bar("GO RAMS") } as never],
      }),
    ).toEqual(["GO RAMS"]);
  });
});
