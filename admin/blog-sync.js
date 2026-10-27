const fs = require('fs');
const path = require('path');

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPostHtml(post) {
  const coverImg = post.coverImage || post.image || '';
  const icon = post.icon || '📝';
  const tags = Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(',').map(t => t.trim()) : []);
  const tagsHtml = tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join(' ');
  const postUrl = post.url || `/blog/${post.slug}/`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(post.title)} // Samarth Blog</title>
  <meta name="title" content="${escapeHtml(post.title)}" />
  <meta name="description" content="${escapeHtml(post.description || '')}" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon/favicon-32x32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon/apple-touch-icon.png" />
  <link rel="canonical" href="${escapeHtml(postUrl)}" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${escapeHtml(postUrl)}" />
  <meta property="og:title" content="${escapeHtml(post.title)}" />
  <meta property="og:description" content="${escapeHtml(post.description || '')}" />
  ${coverImg ? `<meta property="og:image" content="${escapeHtml(coverImg)}" />` : ''}

  <!-- Fonts & Icons -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@400;500;600;700;800&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <link rel="stylesheet" href="/blog/blog.css" />

  <!-- Theme init -->
  <script>
    (function() {
      const savedTheme = localStorage.getItem("theme") || "light";
      document.documentElement.setAttribute("data-theme", savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      }
    })();
  </script>
</head>
<body>

  <!-- Site Header -->
  <header class="site-header">
    <div class="header-inner">
      <div class="site-name">
        <a href="/">Samarth <span class="site-badge">BLOG</span></a>
      </div>
      
      <nav class="menu" aria-label="Main Navigation">
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/#about-me">About</a></li>
          <li><a href="/blog" class="active">Blog</a></li>
          <li><a href="/#portfolio">Projects</a></li>
        </ul>
      </nav>

      <div class="header-actions">
        <button id="darkmode-toggle-id" class="darkmode-toggle" type="button" aria-label="Toggle dark mode" title="Toggle Theme">
          <i class="fas fa-sun light-icon"></i>
          <i class="fas fa-moon dark-icon"></i>
        </button>
      </div>
    </div>
  </header>

  <!-- Article Main -->
  <main class="article-main">
    <div class="back-to-blog">
      <a href="/blog/" class="back-link"><i class="fas fa-arrow-left"></i> Back to all articles</a>
    </div>

    <article>
      ${coverImg ? `
      <div class="article-cover">
        <img src="${escapeHtml(coverImg)}" alt="${escapeHtml(post.title)}" loading="eager" />
      </div>` : ''}

      <header class="article-header">
        <div class="article-meta-row">
          <span class="meta-item"><i class="far fa-calendar-alt"></i> ${escapeHtml(post.date || '')}</span>
          ${post.readingTime ? `<span class="meta-dot">•</span><span class="readingTime"><i class="far fa-clock"></i> ${escapeHtml(post.readingTime)}</span>` : ''}
          ${tags.length > 0 ? `<span class="meta-dot">•</span><div class="post-tags">${tagsHtml}</div>` : ''}
        </div>
        <h1>${escapeHtml(icon)} ${escapeHtml(post.title)}</h1>
      </header>

      <div class="prose">
        ${post.contentHtml || '<p>No content written yet.</p>'}
      </div>

      <!-- Author Bio -->
      <section class="author-bio-card">
        <img src="/assets/profile/1.jpg" alt="Samarth" class="author-bio-avatar" onerror="this.src='/favicon.ico'" />
        <div class="author-bio-content">
          <h3>Written by Samarth Haveliwala</h3>
          <p>Developer building open-source software, games, and hardware — from custom cameras to interactive web platforms.</p>
          <div class="author-bio-links">
            <a href="https://github.com/samarth163-cloud" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> GitHub</a>
            <a href="https://www.youtube.com/@DevStuff5" target="_blank" rel="noopener noreferrer"><i class="fab fa-youtube"></i> YouTube</a>
            <a href="/blog/"><i class="fas fa-book-open"></i> All Articles</a>
          </div>
        </div>
      </section>
    </article>
  </main>

  <!-- Site Footer -->
  <footer class="site-footer">
    <div class="footer-content">
      <p class="copyright">&copy; 2026 <b><a href="/">Samarth</a></b>. Open source portfolio.</p>
      <div class="social-links">
        <a href="https://github.com/samarth163-cloud" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><i class="fab fa-github"></i></a>
        <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
        <a href="https://www.youtube.com/@DevStuff5" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
        <a href="mailto:donsamarth163@gmail.com" aria-label="Email"><i class="far fa-envelope"></i></a>
      </div>
    </div>
  </footer>

  <script>
    const themeBtn = document.getElementById("darkmode-toggle-id");
    function applyTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("dark");
      }
      localStorage.setItem("theme", theme);
    }
    const currentTheme = localStorage.getItem("theme") || "light";
    applyTheme(currentTheme);

    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
      });
    }
  </script>
</body>
</html>`;
}

function renderIndexHtml(blogList) {
  // Collect all unique tags for filter bar
  const allTags = new Set();
  blogList.forEach(p => {
    const tags = Array.isArray(p.tags) ? p.tags : (p.tags ? String(p.tags).split(',').map(t => t.trim()) : []);
    tags.forEach(t => { if (t) allTags.add(t.toLowerCase()); });
  });

  const filterChipsHtml = Array.from(allTags).slice(0, 8).map(tag => {
    return `<button class="filter-chip" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`;
  }).join('\n      ');

  const cardsHtml = blogList.map(post => {
    const slug = post.slug || (post.url ? post.url.replace(/^\/blog\//, '').replace(/\/$/, '') : '');
    const postUrl = post.url || `/blog/${slug}/`;
    const imgUrl = post.coverImage || post.image || '/assets/blog/how-i-won-my-first-game-jam.png';
    const tags = Array.isArray(post.tags) ? post.tags : (post.tags ? String(post.tags).split(',').map(t => t.trim()) : []);
    const tagsDataAttr = tags.join(',').toLowerCase();
    const icon = post.icon || '📝';
    const tagsHtml = tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join(' ');

    return `
      <!-- Article: ${escapeHtml(post.title)} -->
      <article class="blog-card" data-tags="${escapeHtml(tagsDataAttr)}">
        <a href="${escapeHtml(postUrl)}" class="card-link" aria-label="Read ${escapeHtml(post.title)}">
          <div class="card-layout">
            <div class="image-container">
              <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(post.title)}" class="post-image" loading="lazy" width="584" height="332" onerror="this.src='/favicon.ico'" />
            </div>
            <div class="card-content">
              <div>
                <div class="card-header-meta">
                  <span class="post-date"><i class="far fa-calendar-alt"></i> ${escapeHtml(post.date || '')}</span>
                  ${post.readingTime ? `<span class="reading-time"><i class="far fa-clock"></i> ${escapeHtml(post.readingTime)}</span>` : ''}
                </div>
                <h2 class="post-title">${escapeHtml(icon)} ${escapeHtml(post.title)}</h2>
                <p class="post-excerpt">${escapeHtml(post.description || '')}</p>
              </div>
              <div class="card-footer-meta">
                <div class="post-tags">
                  ${tagsHtml}
                </div>
                <span class="read-more-link">Read Article <i class="fas fa-arrow-right"></i></span>
              </div>
            </div>
          </div>
        </a>
      </article>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Samarth // Blog &amp; Tech Journal</title>
  <meta name="title" content="Samarth - Blog" />
  <meta name="description" content="Thoughts, build logs, and deep-dives on hardware hacking, game development, and software engineering by Samarth." />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon/favicon-32x32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/assets/favicon/apple-touch-icon.png" />
  <link rel="canonical" href="/blog/" />
  
  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="/blog/" />
  <meta property="og:title" content="Samarth - Blog" />
  <meta property="og:description" content="Thoughts, build logs, and deep-dives on hardware hacking, game dev, and software engineering." />
  <meta property="og:image" content="/assets/blog/i-made-a-custom-raspberry-pi-camera.png" />

  <!-- Fonts & Icons -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Anton&family=Space+Grotesk:wght@400;500;600;700;800&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
  <link rel="stylesheet" href="/blog/blog.css" />

  <!-- Theme init -->
  <script>
    (function() {
      const savedTheme = localStorage.getItem("theme") || "light";
      document.documentElement.setAttribute("data-theme", savedTheme);
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      }
    })();
  </script>
</head>
<body>

  <!-- Site Header -->
  <header class="site-header">
    <div class="header-inner">
      <div class="site-name">
        <a href="/">Samarth <span class="site-badge">BLOG</span></a>
      </div>
      
      <nav class="menu" aria-label="Main Navigation">
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/#about-me">About</a></li>
          <li><a href="/blog" class="active" aria-current="page">Blog</a></li>
          <li><a href="/#portfolio">Projects</a></li>
        </ul>
      </nav>

      <div class="header-actions">
        <button id="darkmode-toggle-id" class="darkmode-toggle" type="button" aria-label="Toggle dark mode" title="Toggle Theme">
          <i class="fas fa-sun light-icon"></i>
          <i class="fas fa-moon dark-icon"></i>
        </button>
      </div>
    </div>
  </header>

  <!-- Blog Homepage Workspace -->
  <main class="blog-homepage">
    
    <!-- Hero Banner -->
    <header class="blog-hero">
      <div class="blog-hero-eyebrow">
        <i class="fas fa-scroll"></i>
        <span>Journal &amp; Devlogs // Level 2</span>
      </div>
      <h1 class="blog-hero-title">Blog &amp; Essays</h1>
      <p class="blog-hero-desc">
        Thoughts, build journals, and technical writeups on hardware prototyping, game development, and software design.
      </p>
    </header>

    <!-- Tag Filter Bar -->
    <div class="blog-filter-bar" id="filter-bar">
      <button class="filter-chip active" data-tag="all">All Articles</button>
      ${filterChipsHtml}
    </div>

    <!-- Blog Posts List -->
    <div class="blog-list" id="posts-container">
      ${cardsHtml}
    </div>
  </main>

  <!-- Site Footer -->
  <footer class="site-footer">
    <div class="footer-content">
      <p class="copyright">&copy; 2026 <b><a href="/">Samarth</a></b>. Open source portfolio.</p>
      <div class="social-links">
        <a href="https://github.com/samarth163-cloud" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><i class="fab fa-github"></i></a>
        <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
        <a href="https://www.youtube.com/@DevStuff5" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
        <a href="mailto:donsamarth163@gmail.com" aria-label="Email"><i class="far fa-envelope"></i></a>
      </div>
    </div>
  </footer>

  <!-- Interactive Scripts -->
  <script>
    // Theme Switcher Sync
    const themeBtn = document.getElementById("darkmode-toggle-id");
    function applyTheme(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
        document.body.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.body.classList.remove("dark");
      }
      localStorage.setItem("theme", theme);
    }

    const currentTheme = localStorage.getItem("theme") || "light";
    applyTheme(currentTheme);

    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
      });
    }

    // Dynamic Filter Chips
    const chips = document.querySelectorAll(".filter-chip");
    const cards = document.querySelectorAll(".blog-card");

    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        chips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        const filter = chip.getAttribute("data-tag").toLowerCase();

        cards.forEach(card => {
          if (filter === "all") {
            card.style.display = "";
          } else {
            const tags = (card.getAttribute("data-tags") || "").toLowerCase();
            card.style.display = tags.includes(filter) ? "" : "none";
          }
        });
      });
    });
  </script>
</body>
</html>`;
}

function syncBlogFiles(jsonData, rootDir) {
  if (!jsonData || !Array.isArray(jsonData.blog)) return;
  const blogList = jsonData.blog;

  // 1. Generate / Update each individual post HTML
  blogList.forEach(post => {
    let slug = post.slug;
    if (!slug) {
      if (post.url && post.url.startsWith('/blog/')) {
        slug = post.url.replace(/^\/blog\//, '').replace(/\/$/, '');
      } else if (post.title) {
        slug = post.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      } else {
        slug = 'post-' + Date.now();
      }
      post.slug = slug;
    }
    post.url = `/blog/${slug}/`;

    const postDir = path.join(rootDir, 'blog', slug);
    if (!fs.existsSync(postDir)) {
      fs.mkdirSync(postDir, { recursive: true });
    }

    const postHtml = renderPostHtml(post);
    const postFilePath = path.join(postDir, 'index.html');
    fs.writeFileSync(postFilePath, postHtml, 'utf-8');
  });

  // 2. Re-generate blog/index.html
  const blogIndexHtml = renderIndexHtml(blogList);
  const blogIndexPath = path.join(rootDir, 'blog', 'index.html');
  fs.writeFileSync(blogIndexPath, blogIndexHtml, 'utf-8');

  console.log(`[BlogSync] Successfully updated ${blogList.length} blog posts and blog/index.html!`);
}

module.exports = {
  syncBlogFiles,
  renderPostHtml,
  renderIndexHtml
};
