// A Finalsite page with the vendor's mark in the chrome, next to the school's.
//
// Finalsite's version of the Edlio trap: `#fsPoweredByFinalsite` in the footer of
// the header region, holding clean inline SVG with presentation-attribute fills. No
// render risk, sensible size, sits in the site chrome — every quality signal likes
// it, and on a page where the school's own crest is a 400px PNG it can win.
//
// The second thing this fixture pins is the OPPOSITE mistake, and it is the one a
// naive blocklist makes: the school's REAL crest is served from
// `resources.finalsite.net`, because that is where Finalsite hosts its customers'
// uploads. A blocklist that matches the vendor's name anywhere in the URL throws
// away the school's own logo on every Finalsite site in the country. The vendor
// test therefore reads the asset's PATH and the surrounding markup, not the CDN
// hostname.
//
// A district seal is included too — real, related, and not what a parent means by
// "our school" — declared at 60px so the size penalty is what settles it rather
// than a special case.

export const VENDOR_MARK_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Marshall High School | Marshall Unified School District</title>
  <meta property="og:site_name" content="Marshall High School">
  <meta property="og:image" content="https://resources.finalsite.net/images/v1/marshall/og-share-1200.jpg">
  <link rel="stylesheet" href="https://resources.finalsite.net/css/composer.css">
  <style>
    :root { --fs-color-primary: #1D3557; --fs-color-secondary: #E63946; }
    .fsBanner { background: #1D3557; }
  </style>
</head>
<body class="fsElement">
  <header class="fsBanner site-header">
    <a href="/" class="header-logo">
      <img id="school-logo"
           src="https://resources.finalsite.net/images/v1/marshall/marshall-crest.png"
           alt="Marshall High School crest" width="600" height="600">
    </a>
    <img class="district-seal" src="/uploaded/district/seal.png"
         alt="Marshall Unified School District" width="60" height="60">
    <div id="fsPoweredByFinalsite">
      <a href="https://www.finalsite.com">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 24" width="100" height="24" aria-label="Finalsite">
          <rect x="0" y="0" width="100" height="24" fill="#0B7285"></rect>
          <path d="M10 6 h16 v3 h-11 v3 h9 v3 h-9 v6 h-5 z" fill="#FFFFFF"></path>
        </svg>
      </a>
    </div>
  </header>
  <main>
    <h1>Marshall High School</h1>
    <p class="fsElementSlogan">Every student known by name.</p>
    <p>Home of the Mustangs. The Mustangs open their season at home on Friday.</p>
  </main>
</body>
</html>`;
