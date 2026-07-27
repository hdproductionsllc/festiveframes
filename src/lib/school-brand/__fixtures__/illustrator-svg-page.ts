// The black-blob trap, as it actually arrives.
//
// The inline SVG below is the DEFAULT ADOBE ILLUSTRATOR EXPORT: "Save As → SVG →
// Style Elements" writes an internal <style> block with `.st0`, `.st1`, `.st2`
// class rules and puts `class="st0"` on every path. Those class names are literally
// how you recognise an Illustrator file, and this is what a school's designer sends
// the webmaster.
//
// Rasterised by the @napi-rs/canvas this repo already depends on, it comes back
// meanRGB [0,0,0] — a black silhouette — and it passes every check in artwork-qc:
// transparent background, anti-aliased edges whose matte fit correctly declines,
// ink coverage well above the floor, resolution whatever we rendered at. Zero
// findings. `isUsable` says yes.
//
// So this fixture's job is to prove the candidate never gets that far: it is
// dropped at collection, on the source alone, before anything ranks or renders it.
// There is deliberately no other image on the page, so the page then has to produce
// a designed empty state rather than a blank picker.

export const ILLUSTRATOR_SVG_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Mesa Verde Academy | Home</title>
  <meta property="og:site_name" content="Mesa Verde Academy">
  <style>
    :root { --brand-primary: #C8102E; --brand-secondary: #F2A900; }
    .site-header { background: #C8102E; }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="site-logo">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
        <style type="text/css">
          .st0{fill:#C8102E;}
          .st1{fill:#FFFFFF;}
          .st2{fill:#F2A900;}
        </style>
        <circle class="st0" cx="120" cy="120" r="118"/>
        <path class="st1" d="M60 150 L120 40 L180 150 Z"/>
        <path class="st2" d="M90 170 h60 v20 h-60 z"/>
      </svg>
    </div>
    <p class="tagline">Climb higher, together.</p>
  </header>
  <main>
    <h1>Mesa Verde Academy</h1>
    <p>Home of the Ravens. Enrollment for the fall term opens in March.</p>
  </main>
</body>
</html>`;

/**
 * The same mark, exported the way that actually survives a headless render:
 * presentation attributes on the shapes, no <style>, no `class`.
 *
 * Kept next to the broken one so the tests can show that `svgRenderRisks`
 * discriminates rather than just rejecting all SVG — if it flagged both, the safe
 * behaviour would be indistinguishable from "we do not support SVG".
 */
export const SAFE_INLINE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">
  <circle cx="120" cy="120" r="118" fill="#C8102E"/>
  <path d="M60 150 L120 40 L180 150 Z" fill="#FFFFFF"/>
  <path d="M90 170 h60 v20 h-60 z" fill="#F2A900"/>
</svg>`;
