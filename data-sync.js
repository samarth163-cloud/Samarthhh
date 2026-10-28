/**
 * Live Cloud & Local Data Sync Engine for Samarth's Portfolio, Resume & Blog
 * Authoritative cloud source of truth: Supabase PostgreSQL (portfolio_data, id='main')
 * Non-authoritative 0ms instant display cache: localStorage (with cross-tab BroadcastChannel & storage events)
 * Safe fallback: /data/portfolio-data.json
 */

(function () {
  const STORAGE_KEY = "samarth_portfolio_data";
  const LEGACY_KEY = "samarth_portfolio_data_v1";
  const DATA_URL = "/data/portfolio-data.json";
  const CHANNEL_NAME = "samarth_portfolio_sync";

  const DEFAULT_SUPABASE_URL = "https://npzqpcagdtnfuqhyngro.supabase.co";
  const DEFAULT_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wenFwY2FnZHRuZnVxaHluZ3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxMjEzOTEsImV4cCI6MjEwODY5NzM5MX0.N20yyXXnX-ddUDo43ynQOe6f0r6ZoeK4w1MUpPzs37Y";

  let broadcastChannel = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (e) {
    console.warn("BroadcastChannel not supported", e);
  }

  function getSupabaseConfig() {
    let url = DEFAULT_SUPABASE_URL;
    let key = DEFAULT_SUPABASE_KEY;
    try {
      const storedUrl = localStorage.getItem("samarth_supabase_url");
      const storedKey = localStorage.getItem("samarth_supabase_key");
      if (storedUrl && storedUrl.trim()) url = storedUrl.trim();
      if (storedKey && storedKey.trim()) key = storedKey.trim();
    } catch (e) {}
    return { url, key };
  }

  // Escape HTML helper for plain text
  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Safe HTML sanitizer: allows formatting tags while stripping script/iframe/events
  function sanitizeHtml(html) {
    if (!html) return "";
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const allowedTags = new Set([
        "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "A", "P", "BR", "HR",
        "H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL", "LI", "BLOCKQUOTE",
        "CODE", "PRE", "SPAN", "DIV", "IMG", "FIGURE", "FIGCAPTION", "TABLE",
        "THEAD", "TBODY", "TR", "TH", "TD", "MARK", "SUB", "SUP"
      ]);
      const allowedAttrs = new Set([
        "href", "src", "alt", "title", "class", "id", "target", "rel",
        "style", "loading", "width", "height", "data-tag", "data-tags"
      ]);

      function clean(node) {
        const children = Array.from(node.childNodes);
        for (const child of children) {
          if (child.nodeType === Node.ELEMENT_NODE) {
            const tag = child.tagName.toUpperCase();
            if (!allowedTags.has(tag)) {
              child.remove();
              continue;
            }
            for (const attr of Array.from(child.attributes)) {
              const name = attr.name.toLowerCase();
              if (!allowedAttrs.has(name) || name.startsWith("on")) {
                child.removeAttribute(attr.name);
              } else if ((name === "href" || name === "src") && /^(javascript|data:text\/html|vbscript):/i.test(attr.value.trim())) {
                child.removeAttribute(attr.name);
              }
            }
            if (tag === "A" && child.getAttribute("target") === "_blank") {
              child.setAttribute("rel", "noopener noreferrer");
            }
            clean(child);
          }
        }
      }

      clean(doc.body);
      return doc.body.innerHTML;
    } catch (e) {
      console.warn("Sanitization fallback to plain escape", e);
      return escapeHtml(html);
    }
  }

  // Helper to format image URLs and bust browser cache on updates
  function formatImageUrl(url, updatedAt) {
    if (!url) return "";
    if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const clean = url.replace(/^\/+/, "");
    // Resolve relative asset paths to Supabase Cloud Storage CDN
    if (clean.startsWith("assets/")) {
      return "https://npzqpcagdtnfuqhyngro.supabase.co/storage/v1/object/public/portfolio-assets/" + clean.split("/").map(encodeURIComponent).join("/") + (updatedAt ? `?v=${updatedAt}` : "");
    }
    const cleanUrl = "/" + clean;
    if (updatedAt) {
      return `${cleanUrl}?v=${updatedAt}`;
    }
    return cleanUrl;
  }

  // 1. Fetch from Supabase Cloud (Authoritative shared source of truth)
  async function fetchSupabaseData() {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) return null;

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 7000); // 7s polite timeout
      const endpoint = `${url.replace(/\/+$/, "")}/rest/v1/portfolio_data?id=eq.main&select=*`;
      const res = await fetch(endpoint, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
        signal: controller.signal,
      });
      clearTimeout(tid);

      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0]?.data) {
          const cloudData = rows[0].data;
          if (!cloudData._updatedAt && rows[0].updated_at) {
            cloudData._updatedAt = new Date(rows[0].updated_at).getTime();
          }
          return cloudData;
        }
      }
    } catch (err) {
      console.warn("Supabase fetch unavailable, using cached fallback:", err.message);
    }
    return null;
  }

  // 2. Fallback: static JSON file on server
  async function fetchServerFallback() {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(DATA_URL + "?v=" + Date.now(), {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(tid);
      if (res.ok) return await res.json();
    } catch (e) {}
    return null;
  }

  // 3. Local Cache (Non-authoritative 0ms display cache)
  function getCachedData() {
    try {
      const localStr = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
      if (localStr) return JSON.parse(localStr);
    } catch (e) {}
    return null;
  }

  // Authoritative data loading flow
  async function loadData() {
    // 1. Check Supabase cloud first: shared single source of truth
    const cloudData = await fetchSupabaseData();
    if (cloudData) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
      } catch (e) {}
      return cloudData;
    }

    // 2. Supabase unreachable (offline/error) -> fallback to localStorage cache
    const cached = getCachedData();
    if (cached) {
      return cached;
    }

    // 3. No local cache -> fallback to static JSON
    const serverData = await fetchServerFallback();
    if (serverData) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
      } catch (e) {}
      return serverData;
    }

    return null;
  }

  // Update browser tab title and favicon dynamically
  function updateBrowserTabMeta(data, isResume = false) {
    if (!data || !data.general) return;

    // 1. Browser Tab Title
    if (isResume) {
      const resumeTitle = data.general.siteTitle
        ? `${data.general.siteTitle} - Resume`
        : (data.resume?.header?.name ? `${data.resume.header.name}'s Resume` : "Samarth's Resume");
      document.title = resumeTitle;
    } else {
      const siteTitle = data.general.siteTitle || (data.general.name ? `${data.general.name}'s Portfolio` : "Samarth's Portfolio");
      if (siteTitle) {
        document.title = siteTitle;

        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute("content", siteTitle);

        const twTitle = document.querySelector('meta[name="twitter:title"]');
        if (twTitle) twTitle.setAttribute("content", siteTitle);
      }
    }

    // 2. Favicon
    if (data.general.favicon && (data.general.favicon.startsWith("data:") || !data.general.favicon.includes("favicon-32x32.png"))) {
      const favUrl = formatImageUrl(data.general.favicon, data._updatedAt);
      const standardIcon = document.querySelector("link[rel='icon']:not([sizes]), link[rel='icon'][sizes='32x32']");
      if (standardIcon) {
        standardIcon.href = favUrl;
      }
    }
  }

  // Hydrate Index (Portfolio Homepage)
  function renderIndexPage(data) {
    if (!data) return;

    updateBrowserTabMeta(data, false);

    // 1. Hero & General
    if (data.general) {
      const h1 = document.querySelector("#header-wrapper header h1");
      if (h1 && data.general.name) h1.textContent = data.general.name;

      const desc = document.querySelector("#header-wrapper header p.description");
      if (desc && data.general.description) desc.textContent = data.general.description;

      const profilePic = document.getElementById("profile-pic");
      const avList = Array.isArray(data.general.avatars) && data.general.avatars.length > 0
        ? data.general.avatars
        : (data.general.profilePic ? [data.general.profilePic] : ["assets/profile/1.jpg"]);

      window.__portfolioAvatars = avList;

      // Preload avatar sequence images
      avList.forEach((src) => {
        const clean = src.startsWith("data:") || src.startsWith("http") ? src : (src.startsWith("/") ? src : `/${src}`);
        const img = new Image();
        img.src = clean;
      });

      const activePic = data.general.profilePic || avList[0];
      const startIdx = avList.indexOf(activePic);
      if (typeof window.__currentAvatarIdx !== "number" || window.__currentAvatarIdx < 0 || window.__currentAvatarIdx >= avList.length) {
        window.__currentAvatarIdx = startIdx >= 0 ? startIdx : 0;
      }

      if (profilePic && activePic) {
        if (!profilePic.src || profilePic.src.includes("2.jpg") || window.__currentAvatarIdx === startIdx) {
          profilePic.src = formatImageUrl(activePic, data._updatedAt);
        }
      }

      const heroCtaBtn = document.querySelector(".hero-cta .cta-button:first-child");
      if (heroCtaBtn && data.general.ctaText) {
        heroCtaBtn.innerHTML = `${escapeHtml(data.general.ctaText)} <i class="fa-solid fa-arrow-down"></i>`;
      }

      const heroCtaNote = document.querySelector(".hero-cta .cta-note");
      if (heroCtaNote && data.general.ctaSubtext) {
        heroCtaNote.textContent = data.general.ctaSubtext;
      }

      // Social Links
      if (Array.isArray(data.general.socials) && data.general.socials.length > 0) {
        const socialContainer = document.querySelector(".social-links");
        if (socialContainer) {
          socialContainer.innerHTML = data.general.socials
            .map(
              (s) =>
                `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(
                  s.name
                )}"><i class="${escapeHtml(s.icon || "fas fa-link")}"></i></a>`
            )
            .join("");
        }
      }
    }

    // 2. About Me Section
    if (data.about) {
      const aboutBox = document.querySelector("#about-me .about-box");
      if (aboutBox) {
        // Main Bio
        const firstP = aboutBox.querySelector("p:first-child");
        if (firstP && data.about.bio) {
          firstP.innerHTML = sanitizeHtml(data.about.bio);
        }

        // Highlights ("Some things I have done")
        if (Array.isArray(data.about.highlights)) {
          const highlightsHeader = Array.from(aboutBox.querySelectorAll("h3")).find((h) =>
            h.textContent.includes("Some things")
          );
          if (highlightsHeader) {
            let nextUl = highlightsHeader.nextElementSibling;
            while (nextUl && nextUl.tagName !== "UL") {
              nextUl = nextUl.nextElementSibling;
            }
            if (nextUl) {
              nextUl.innerHTML = data.about.highlights
                .map((item) => `<li>${sanitizeHtml(item.text || item.html || "")}</li>`)
                .join("");
            }
          }
        }

        // Skills, Methodologies, and Tools
        if (Array.isArray(data.about.skillsCategories)) {
          const skillsHeader = Array.from(aboutBox.querySelectorAll("h3")).find((h) =>
            h.textContent.includes("Skills")
          );
          if (skillsHeader) {
            let nextUl = skillsHeader.nextElementSibling;
            while (nextUl && nextUl.tagName !== "UL") {
              nextUl = nextUl.nextElementSibling;
            }
            if (nextUl) {
              nextUl.innerHTML = data.about.skillsCategories
                .map(
                  (cat) =>
                    `<li><b>${escapeHtml(cat.category)}:</b> ${escapeHtml(cat.skills)}</li>`
                )
                .join("");
            }
          }
        }
      }

      // Hackatime badge visibility
      const codingTimeBadge = document.getElementById("total-coding-time");
      if (codingTimeBadge && typeof data.about.showCodingStats === "boolean") {
        codingTimeBadge.style.display = data.about.showCodingStats ? "" : "none";
      }
    }

    // 3. Projects Showcase
    if (Array.isArray(data.projects)) {
      const cardsContainer = document.querySelector("#portfolio .cards");
      if (cardsContainer) {
        cardsContainer.innerHTML = data.projects
          .map((p) => {
            const techBadges = Array.isArray(p.tech)
              ? p.tech
                  .map(
                    (t) =>
                      `<span title="${escapeHtml(t.name || "")}"><i class="${escapeHtml(
                        t.icon || "fas fa-code"
                      )}"></i></span>`
                  )
                  .join("")
              : "";

            const sourceBtn = p.sourceUrl
              ? `<a href="${escapeHtml(
                  p.sourceUrl
                )}" class="source-link" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> View Source</a>`
              : "";

            const visitBtn = p.visitUrl
              ? `<a href="${escapeHtml(
                  p.visitUrl
                )}" class="visit-link" target="_blank" rel="noopener noreferrer">${escapeHtml(
                  p.visitLabel || "Visit"
                )} <i class="fa-solid fa-link"></i></a>`
              : "";

            const imageSrc = formatImageUrl(p.image || "assets/projects/pishot.png", data._updatedAt);

            return `
            <div class="card" data-project-id="${escapeHtml(p.id || "")}">
              <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(p.title || "")}" loading="lazy" />
              <div class="card-content">
                <b>${escapeHtml(p.title || "")}</b>
                <p>${sanitizeHtml(p.description || "")}</p>
              </div>
              <div class="card-tech">
                ${techBadges}
              </div>
              <div class="card-footer">
                ${sourceBtn}
                ${visitBtn}
              </div>
            </div>`;
          })
          .join("");
      }
    }

    // 4. Blog Posts Showcase on Homepage
    if (Array.isArray(data.blog) && data.blog.length > 0) {
      const blogCardsContainer = document.querySelector("#blog .blog-cards");
      if (blogCardsContainer) {
        blogCardsContainer.innerHTML = data.blog
          .map((b) => {
            const tags = Array.isArray(b.tags)
              ? b.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")
              : "";
            const blogImg = formatImageUrl(b.image || b.coverImage || "", data._updatedAt);
            return `
            <article class="blog-card" data-blog-id="${escapeHtml(b.id || "")}">
              <a href="${escapeHtml(b.url || ('/blog/' + (b.slug || '') + '/'))}" class="blog-card-link" aria-label="Read ${escapeHtml(b.title || "")}">
                <img src="${escapeHtml(blogImg)}" alt="${escapeHtml(b.title || "")}" loading="lazy" onerror="this.src='/favicon.ico'" />
                <div class="blog-card-content">
                  <p class="blog-date">${escapeHtml(b.date || "")}</p>
                  <h3>${escapeHtml(b.title || "")}</h3>
                  <p>${escapeHtml(b.description || "")}</p>
                  <div class="blog-tags" aria-label="Post tags">${tags}</div>
                  <span class="read-post-link">Read post <i class="fa-solid fa-arrow-right"></i></span>
                </div>
              </a>
            </article>`;
          })
          .join("");
      }
    }

    // 5. Resume Link Visibility (Master On/Off)
    if (data.resume) {
      const isResumeVisible = data.resume.visible !== false;
      const menuResumeLinks = document.querySelectorAll('#site-menu a[href*="resume"]');
      menuResumeLinks.forEach((a) => {
        const li = a.closest("li");
        if (li) li.style.display = isResumeVisible ? "" : "none";
        else a.style.display = isResumeVisible ? "" : "none";
      });
      const heroResumeLinks = document.querySelectorAll('.hero-cta a[href*="resume"]');
      heroResumeLinks.forEach((a) => {
        a.style.display = isResumeVisible ? "" : "none";
      });
    }
  }

  // Hydrate Resume Page
  function renderResumePage(data) {
    if (!data || !data.resume) return;

    updateBrowserTabMeta(data, true);

    const r = data.resume;
    const secToggles = r.sections || {};
    const secTitles = r.sectionTitles || {};

    // Master Visibility Check
    const isVisible = r.visible !== false;
    let isAdmin = false;
    try {
      isAdmin = sessionStorage.getItem("samarth_admin_auth") === "true" || !!localStorage.getItem("samarth_admin_session");
    } catch (e) {}

    const resumeSheet = document.querySelector(".resume-sheet");
    const privateNotice = document.getElementById("resume-private-notice");
    let adminBanner = document.getElementById("resume-admin-preview-banner");

    if (!isVisible) {
      if (isAdmin) {
        if (resumeSheet) resumeSheet.style.display = "";
        if (privateNotice) privateNotice.style.display = "none";
        if (!adminBanner) {
          adminBanner = document.createElement("div");
          adminBanner.id = "resume-admin-preview-banner";
          adminBanner.className = "admin-preview-banner";
          adminBanner.innerHTML = `
            <span><i class="fas fa-eye-slash"></i> <strong>ADMIN PREVIEW MODE:</strong> Resume is currently set to <strong>OFF (Private)</strong> for the public.</span>
            <a href="/admin/#tab-resume"><i class="fas fa-gear"></i> Turn ON in Admin</a>
          `;
          const breadcrumb = document.querySelector(".breadcrumb");
          if (breadcrumb) {
            breadcrumb.insertAdjacentElement("afterend", adminBanner);
          }
        } else {
          adminBanner.style.display = "flex";
        }
      } else {
        if (resumeSheet) resumeSheet.style.display = "none";
        if (adminBanner) adminBanner.style.display = "none";
        if (privateNotice) {
          privateNotice.style.display = "block";
        }
        return;
      }
    } else {
      if (resumeSheet) resumeSheet.style.display = "";
      if (privateNotice) privateNotice.style.display = "none";
      if (adminBanner) adminBanner.style.display = "none";
    }

    // 1. Header
    if (r.header) {
      const h1 = document.querySelector(".resume-header h1");
      if (h1 && r.header.name) h1.textContent = r.header.name;

      const eyebrow = document.querySelector(".resume-header .eyebrow");
      if (eyebrow && r.header.eyebrow) eyebrow.textContent = r.header.eyebrow;

      const headline = document.querySelector(".resume-header .headline");
      if (headline && r.header.headline) headline.textContent = r.header.headline;

      const loc = document.querySelector(".resume-header .location");
      if (loc && r.header.location) {
        loc.innerHTML = `<i class="fas fa-location-dot"></i> ${escapeHtml(r.header.location)}`;
      }

      if (Array.isArray(r.header.contacts) && r.header.contacts.length > 0) {
        const contactLinks = document.querySelector(".resume-header .contact-links");
        if (contactLinks) {
          contactLinks.innerHTML = r.header.contacts
            .map(
              (c) =>
                `<a href="${escapeHtml(c.url)}" target="_blank" rel="noopener noreferrer"><i class="${escapeHtml(
                  c.icon || "fas fa-link"
                )}"></i> ${escapeHtml(c.label)}</a>`
            )
            .join("");
        }
      }
    }

    // Coding Stats Section
    const statsSec = document.getElementById("resume-sec-stats") || document.querySelector(".stats-section");
    const showStats = r.stats ? r.stats.visible !== false : true;
    const showStatsSec = secToggles.stats !== false;
    if (statsSec) {
      if (!showStats || !showStatsSec) {
        statsSec.style.display = "none";
      } else {
        statsSec.style.display = "";
        if (r.stats) {
          const statsH2 = statsSec.querySelector("h2");
          if (statsH2 && r.stats.title) statsH2.textContent = r.stats.title;
          const statsP = statsSec.querySelector(".stats-heading p, #stats-note");
          if (statsP && r.stats.note) statsP.textContent = r.stats.note;

          if (typeof window.__renderResumeCodingStats === "function") {
            window.__renderResumeCodingStats(r.stats);
          }
        }
      }
    }

    // 2. Sections
    const sections = document.querySelectorAll(".resume-sheet > section");
    sections.forEach((sec) => {
      const secId = sec.id || "";
      const h2 = sec.querySelector("h2");
      const title = h2 ? h2.textContent.trim().toLowerCase() : "";

      // Introduction
      if (secId === "resume-sec-intro" || title.includes("intro")) {
        const isIntroVisible = secToggles.intro !== false;
        sec.style.display = isIntroVisible ? "" : "none";
        if (h2) h2.textContent = secTitles.intro || "Introduction";
        if (isIntroVisible && r.introduction) {
          const p = sec.querySelector("p");
          if (p) p.innerHTML = sanitizeHtml(r.introduction);
        }
        return;
      }

      // Stats
      if (secId === "resume-sec-stats" || title.includes("stats")) {
        return;
      }

      // Experience
      if (secId === "resume-sec-experience" || title.includes("experience")) {
        const isExpSecVisible = secToggles.experience !== false;
        if (!isExpSecVisible) {
          sec.style.display = "none";
          return;
        }
        if (Array.isArray(r.experience)) {
          const activeExps = r.experience.filter((exp) => exp.visible !== false);
          if (activeExps.length === 0) {
            sec.style.display = "none";
            return;
          }
          sec.style.display = "";
          const articlesHtml = activeExps
            .map(
              (exp) => `
            <article class="entry">
              <div class="entry-heading">
                <h3>${escapeHtml(exp.title || exp.role || "")}</h3>
                <span>${escapeHtml(exp.period || "")}</span>
              </div>
              <ul>
                ${(exp.bullets || []).map((b) => `<li>${sanitizeHtml(b)}</li>`).join("")}
              </ul>
            </article>`
            )
            .join("");
          sec.innerHTML = `<h2>${escapeHtml(secTitles.experience || "Experience")}</h2>` + articlesHtml;
        }
        return;
      }

      // Projects on Resume
      if (secId === "resume-sec-projects" || title.includes("project")) {
        const isProjSecVisible = secToggles.projects !== false;
        if (!isProjSecVisible) {
          sec.style.display = "none";
          return;
        }
        if (Array.isArray(r.projects)) {
          const activeProjs = r.projects.filter((p) => p.visible !== false);
          if (activeProjs.length === 0) {
            sec.style.display = "none";
            return;
          }
          sec.style.display = "";
          const projHtml = activeProjs
            .map(
              (p) => `
            <article class="entry">
              <div class="entry-heading">
                <h3>${escapeHtml(p.title || "")}</h3>
                <span>${escapeHtml(p.meta || p.subtitle || "")}</span>
              </div>
              <p>${sanitizeHtml(p.description || "")}</p>
            </article>`
            )
            .join("");
          sec.innerHTML = `<h2>${escapeHtml(secTitles.projects || "Some of my (cool?) projects")}</h2>` + projHtml;
        }
        return;
      }

      // Education
      if (secId === "resume-sec-education" || title.includes("education")) {
        const isEduSecVisible = secToggles.education !== false;
        if (!isEduSecVisible) {
          sec.style.display = "none";
          return;
        }
        if (Array.isArray(r.education)) {
          const activeEdus = r.education.filter((ed) => ed.visible !== false);
          if (activeEdus.length === 0) {
            sec.style.display = "none";
            return;
          }
          sec.style.display = "";
          const eduHtml = activeEdus
            .map(
              (ed) => `
            <article class="entry">
              <div class="entry-heading">
                <h3>${escapeHtml(ed.institution || "")}</h3>
                <span>${escapeHtml(ed.meta || ed.subtitle || "")}</span>
              </div>
              <p>${sanitizeHtml(ed.description || "")}</p>
            </article>`
            )
            .join("");
          sec.innerHTML = `<h2>${escapeHtml(secTitles.education || "Education")}</h2>` + eduHtml;
        }
        return;
      }

      // Recognition
      if (secId === "resume-sec-recognition" || title.includes("recognition")) {
        const isRecSecVisible = secToggles.recognition !== false;
        if (!isRecSecVisible || !Array.isArray(r.recognition) || r.recognition.length === 0) {
          sec.style.display = "none";
          return;
        }
        sec.style.display = "";
        sec.innerHTML =
          `<h2>${escapeHtml(secTitles.recognition || "Recognition")}</h2><ul>` +
          r.recognition.map((rec) => `<li>${sanitizeHtml(rec)}</li>`).join("") +
          `</ul>`;
        return;
      }

      // Skills
      if (secId === "resume-sec-skills" || title.includes("skill")) {
        const isSkillsSecVisible = secToggles.skills !== false;
        if (!isSkillsSecVisible || !r.skills) {
          sec.style.display = "none";
          return;
        }
        sec.style.display = "";
        sec.innerHTML = `<h2>${escapeHtml(secTitles.skills || "Skills")}</h2><p class="skills">${escapeHtml(r.skills)}</p>`;
        return;
      }
    });
  }

  // Hydrate Blog Listing Page (/blog/)
  function renderBlogListPage(data) {
    if (!data || !Array.isArray(data.blog)) return;

    updateBrowserTabMeta(data, false);

    const postsContainer = document.getElementById("posts-container");
    if (!postsContainer) return;

    postsContainer.innerHTML = data.blog
      .map((b) => {
        const tags = Array.isArray(b.tags) ? b.tags : (b.tags ? String(b.tags).split(",").map(t => t.trim()) : []);
        const tagsHtml = tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join(" ");
        const tagDataAttr = tags.join(",");
        const blogImg = formatImageUrl(b.image || b.coverImage || "/assets/blog/how-i-won-my-first-game-jam.png", data._updatedAt);
        const postUrl = b.url || (`/blog/${encodeURIComponent(b.slug || "")}/`);
        const iconPrefix = b.icon ? `${escapeHtml(b.icon)} ` : "";

        return `
        <article class="blog-card" data-tags="${escapeHtml(tagDataAttr)}">
          <a href="${escapeHtml(postUrl)}" class="card-link" aria-label="Read ${escapeHtml(b.title || "")}">
            <div class="card-layout">
              <div class="image-container">
                <img src="${escapeHtml(blogImg)}" alt="${escapeHtml(b.title || "")}" class="post-image" loading="lazy" width="584" height="332" onerror="this.src='/favicon.ico'" />
              </div>
              <div class="card-content">
                <div>
                  <div class="card-header-meta">
                    <span class="post-date"><i class="far fa-calendar-alt"></i> ${escapeHtml(b.date || "")}</span>
                    <span class="reading-time"><i class="far fa-clock"></i> ${escapeHtml(b.readingTime || "5 min read")}</span>
                  </div>
                  <h2 class="post-title">${iconPrefix}${escapeHtml(b.title || "")}</h2>
                  <p class="post-excerpt">${escapeHtml(b.description || "")}</p>
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
      })
      .join("");
  }

  // Hydrate Individual Blog Article Page (/blog/<slug>/)
  function renderBlogArticlePage(data) {
    if (!data || !Array.isArray(data.blog)) return;
    const articleMain = document.querySelector(".article-main");
    if (!articleMain) return;

    // Determine current post from URL pathname or query param
    const pathname = window.location.pathname.replace(/\/+$/, "");
    const slugMatch = pathname.match(/blog\/([^/]+)$/);
    const searchParams = new URLSearchParams(window.location.search);
    const targetSlug = searchParams.get("slug") || (slugMatch ? slugMatch[1] : null);

    if (!targetSlug) return;

    const post = data.blog.find((b) => b.slug === targetSlug || (b.url && b.url.includes(targetSlug)));
    if (!post) return;

    // Update document title & metadata
    if (post.title) {
      document.title = `${post.title} // Samarth Blog`;
    }

    // Update Header / Meta in DOM
    const titleEl = document.querySelector(".article-header h1") || document.querySelector("h1.article-title");
    if (titleEl && post.title) {
      titleEl.textContent = `${post.icon ? post.icon + " " : ""}${post.title}`;
    }

    const dateEl = document.querySelector(".article-date") || document.querySelector(".article-meta .post-date");
    if (dateEl && post.date) {
      dateEl.innerHTML = `<i class="far fa-calendar-alt"></i> ${escapeHtml(post.date)}`;
    }

    const readTimeEl = document.querySelector(".reading-time") || document.querySelector(".article-meta .read-time");
    if (readTimeEl && post.readingTime) {
      readTimeEl.innerHTML = `<i class="far fa-clock"></i> ${escapeHtml(post.readingTime)}`;
    }

    const tagsContainer = document.querySelector(".article-tags") || document.querySelector(".post-tags");
    if (tagsContainer && Array.isArray(post.tags)) {
      tagsContainer.innerHTML = post.tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join(" ");
    }

    // Update Cover Image
    const coverImg = document.querySelector(".article-cover img") || document.querySelector(".post-hero-image img");
    const activeCover = post.coverImage || post.image;
    if (coverImg && activeCover) {
      coverImg.src = formatImageUrl(activeCover, data._updatedAt);
    }

    // Update Content
    const contentEl = document.querySelector(".article-content") || document.querySelector("#article-content");
    if (contentEl && post.contentHtml) {
      contentEl.innerHTML = sanitizeHtml(post.contentHtml);
    }
  }

  // Master dispatcher to hydrate all relevant pages
  function hydrateAllPages(data) {
    if (!data) return;

    if (document.querySelector("#about-me") || document.querySelector("#portfolio")) {
      renderIndexPage(data);
    }

    if (document.querySelector(".resume-sheet") || document.getElementById("resume-private-notice")) {
      renderResumePage(data);
    }

    if (document.getElementById("posts-container")) {
      renderBlogListPage(data);
    }

    if (document.querySelector(".article-main")) {
      renderBlogArticlePage(data);
    }
  }

  // Master Render Flow: Instant 0ms cache first, then authoritative cloud fetch
  async function syncAndRender() {
    // 1. Instant cache render (0ms response)
    const cached = getCachedData();
    if (cached) {
      window.__portfolioData = cached;
      hydrateAllPages(cached);
    }

    // 2. Fetch authoritative fresh cloud data
    const fresh = await loadData();
    if (fresh) {
      window.__portfolioData = fresh;
      hydrateAllPages(fresh);
    }
  }

  // Initialize on DOM load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      syncAndRender();
    });
  } else {
    syncAndRender();
  }

  // Cross-tab live updates via BroadcastChannel
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      if (event.data && event.data.type === "PORTFOLIO_UPDATED") {
        syncAndRender();
      }
    };
  }

  // Cross-tab live updates via window storage event
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      syncAndRender();
    }
  });

  // Global helper for console & scripts
  window.__refreshPortfolioData = syncAndRender;
})();
