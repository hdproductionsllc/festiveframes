// A page whose ONLY image is a favicon.
//
// Small schools and single-page sites look exactly like this: the name is set in
// type, the header has no crest, and the only mark in the document is /favicon.ico
// plus an apple-touch-icon.
//
// It exists to pin the shape of "found something, none of it prints". Both icons
// ARE collected — a candidate shown as "too small to print" is more useful than a
// page that appears to have no logo — and both are then blocked by the resolution
// gate: 32px is 16 DPI on a 2" badge and 180px is 91 DPI, against a 200 DPI floor.
//
// It also has no <style> block at all, which is the only place the "colours could
// only come from meta and inline styles" warning can be exercised.

export const FAVICON_ONLY_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Riverbend Charter Academy</title>
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
</head>
<body>
  <header style="background-color:#1B4D3E">
    <h1>Riverbend Charter Academy</h1>
    <p class="motto">Small school, big horizons.</p>
  </header>
  <main>
    <p>Riverbend Charter Academy is a K-8 public charter school serving 240 students
       on the north bank. Office hours are 7:30am to 4:00pm.</p>
  </main>
</body>
</html>`;
