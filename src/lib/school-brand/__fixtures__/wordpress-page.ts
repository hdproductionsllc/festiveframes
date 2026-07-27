// A generic WordPress school site, written by hand.
//
// The "unremarkable" fixture, and the one that proves the generic path carries its
// weight. What it pins:
//
//   - the SAME crest twice with different `?ver=` cache-busters. WordPress does this
//     to every asset; without de-duping on the path, the picker shows the parent the
//     same logo twice and looks broken.
//   - JSON-LD inside `@graph` — Yoast/RankMath's shape, with the School node buried
//     in an array rather than at the top level.
//   - `--wp--preset--color--primary`, the block-theme palette variable.
//   - a Facebook icon sitting in the header next to the crest. Logo-shaped,
//     header-resident, and not the school's.
//   - "Go Wildcats!" plus a mascot in the title, so the phrase rule and the lexicon
//     rule both fire on the same word and have to merge rather than duplicate.

export const WORDPRESS_PAGE = `<!DOCTYPE html>
<html lang="en-US">
<head>
  <meta charset="UTF-8">
  <meta name="generator" content="WordPress 6.4.2">
  <title>Home &#8211; Westbrook Middle School</title>
  <meta name="description" content="Westbrook Middle School serves grades 6-8 in the Cedar Valley district. Enrollment for the fall term is open now.">
  <meta name="theme-color" content="#7A0019">
  <link rel="stylesheet" href="/wp-content/themes/schoolpress/style.css?ver=6.4.2">
  <link rel="icon" href="/wp-content/uploads/2023/09/cropped-favicon-32x32.png" sizes="32x32">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@graph":[
    {"@type":"WebSite","name":"Westbrook Middle School","url":"https://westbrookms.org/"},
    {"@type":"School","name":"Westbrook Middle School","slogan":"Curiosity, courage, community.","url":"https://westbrookms.org/"}
  ]}
  </script>
  <style>
    :root {
      --wp--preset--color--primary: #7A0019;
      --wp--preset--color--secondary: #FFCC33;
      --wp--preset--color--base: #FFFFFF;
    }
    body { color: #333333; background: #FFFFFF; }
    .site-header { background-color: #7A0019; }
    .site-title { color: #FFCC33; }
    a { color: #7A0019; }
    a:hover { color: #5A0013; }
  </style>
</head>
<body class="home wp-singular">
  <header class="site-header">
    <div class="site-branding">
      <a href="https://westbrookms.org/" class="custom-logo-link">
        <img class="custom-logo" src="/wp-content/uploads/2023/09/westbrook-logo.png?ver=6.4.2"
             alt="Westbrook Middle School" width="400" height="400">
      </a>
      <p class="site-title">Westbrook Middle School</p>
      <p class="site-description">Curiosity, courage, community.</p>
    </div>
    <ul class="social-links">
      <li><a href="https://facebook.com/westbrookms"><img src="/wp-content/themes/schoolpress/img/facebook-icon.png" alt="Facebook" width="32" height="32"></a></li>
    </ul>
  </header>

  <main>
    <h1>Welcome</h1>
    <p>Go Wildcats! The Westbrook Wildcats girls' cross-country team qualified for
       regionals this week, and the Wildcats robotics club placed third at the
       county meet.</p>
    <img src="/wp-content/uploads/2023/09/westbrook-logo.png?ver=6.4.3"
         alt="Westbrook Middle School" width="400" height="400">
  </main>

  <footer>
    <p>&copy; 2026 Westbrook Middle School. Proudly powered by <a href="https://wordpress.org">WordPress</a>.</p>
  </footer>
</body>
</html>`;
