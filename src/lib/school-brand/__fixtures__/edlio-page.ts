// An Edlio-shaped school home page, written by hand.
//
// WHY IT IS HAND-WRITTEN AND NOT CAPTURED. The sandbox this was built in cannot
// reach a school website — every CONNECT through the proxy is answered "403" — so
// there is no honest way to save a real page here, and a test that pretended to
// fetch one would be a test of nothing. Every construct below is instead taken from
// Edlio's documented/observed output, and each one exists to pin a specific
// behaviour:
//
//   - `<div class="edlio-logo">` wrapping an inline SVG: EDLIO'S OWN CORPORATE MARK
//     in the school's header. Clean SVG, presentation-attribute fills, no render
//     risk at all — so it can ONLY be excluded by the vendor blocklist. That is the
//     point of it. It out-scores the school's crest on every quality signal.
//   - a `:root` custom-property block INSIDE `<main>`, not in `<head>`. This is why
//     `styleBlocks` scans the whole document; a head-only scan finds no colours on
//     this page at all.
//   - `og:image` pointing at a 250px asset — Edlio caps it, and 250px is 125 DPI on
//     a 2" badge, which `evaluateResolution` blocks. It is a filename hint, never a
//     candidate.
//   - the school's real crest as a plain `<img>` in `/pics/`, Edlio's media route.

export const EDLIO_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="generator" content="Edlio CMS">
  <title>Lincoln High School - Home</title>
  <meta property="og:site_name" content="Lincoln High School">
  <meta property="og:title" content="Lincoln High School - Home">
  <meta property="og:description" content="Excellence in every classroom. Home of the Eagles.">
  <meta property="og:image" content="/pics/og-lincoln-crest-250.png">
  <meta name="theme-color" content="#0B3D91">
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="apple-touch-icon" href="/pics/touch-icon-180.png" sizes="180x180">
  <script src="//apps.edlio.com/js/bundle.min.js"></script>
  <style>
    body { margin: 0; font-family: Georgia, serif; color: #222222; }
    .site-header { background: #0B3D91; padding: 12px; }
    .site-header a { color: #FFFFFF; }
  </style>
</head>
<body class="edlio-site">
  <header class="site-header">
    <a href="/" class="school-logo-link">
      <img class="school-logo" src="/pics/lincoln-crest.png"
           alt="Lincoln High School logo" width="512" height="512">
    </a>
    <div class="edlio-logo">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 32" width="120" height="32" role="img" aria-label="Edlio">
        <rect x="0" y="0" width="120" height="32" fill="#00A0DF"></rect>
        <path d="M12 8 h20 v4 h-14 v4 h12 v4 h-12 v4 h14 v4 h-20 z" fill="#FFFFFF"></path>
      </svg>
    </div>
    <nav class="site-nav">
      <a href="/about">About</a>
      <a href="/calendar">Calendar</a>
    </nav>
  </header>

  <main>
    <style>
      /* Edlio emits the palette here, next to the content it styles - NOT in head. */
      :root {
        --primary-color: #0B3D91;
        --secondary-color: #C5A253;
        --body-text: #333333;
      }
      .hero { background: var(--primary-color); }
    </style>
    <p class="tagline">Excellence in every classroom, every day.</p>
    <h1>Lincoln High School</h1>
    <section class="welcome">
      <p>Welcome to Lincoln High School. Home of the Eagles! Our Eagles compete in
         fourteen sports and our Eagles marching band took first at state.</p>
    </section>
  </main>

  <footer class="site-footer">
    <div class="edlio-footer">
      <a href="https://www.edlio.com">Powered by Edlio</a>
      <img src="https://cdn.edlio.com/img/edlio-logo-footer.png" alt="Edlio" width="90" height="24">
    </div>
  </footer>
</body>
</html>`;
