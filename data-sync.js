/**
 * Live Data Sync Engine for Samarth's Portfolio & Resume
 * Seamlessly hydrates DOM with customized data from localStorage / portfolio-data.json
 * Supports instant cross-tab live updates via BroadcastChannel & Storage events.
 */

(function () {
  const STORAGE_KEY = "samarth_portfolio_data";
  const LEGACY_KEY = "samarth_portfolio_data_v1";
  const DATA_URL = "/data/portfolio-data.json";
  const CHANNEL_NAME = "samarth_portfolio_sync";

  let broadcastChannel = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (e) {
    console.warn("BroadcastChannel not supported", e);
  }

  // Load data: sync server data across all devices globally
  async function loadData() {
    let serverData = null;
    try {
      const res = await fetch(DATA_URL + "?v=" + Date.now(), { cache: "no-store" });
      if (res.ok) {
        serverData = await res.json();
      }
    } catch (e) {
      console.warn("Could not fetch fresh server data", e);
    }

    try {
      const localStr = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
      if (localStr) {
        const local = JSON.parse(localStr);
        // If server data exists, compare timestamps
        if (serverData) {
          const serverTime = serverData._updatedAt || 0;
          const localTime = local._updatedAt || 0;
          if (serverTime >= localTime) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData)); } catch(e){}
            return serverData;
          }
        }
        return local;
      }
    } catch (e) {
      console.warn("Could not read from localStorage", e);
    }

    if (serverData) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData)); } catch(e){}
      return serverData;
    }

    return null;
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Helper to format image URLs and bust browser cache on updates
  function formatImageUrl(url, updatedAt) {
    if (!url) return "";
    if (url.startsWith("data:") || url.startsWith("blob:") || url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const cleanUrl = url.startsWith("/") ? url : "/" + url;
    if (updatedAt) {
      return `${cleanUrl}?v=${updatedAt}`;
    }
    return cleanUrl;
  }

  // Update browser tab title and favicon dynamically
  function updateBrowserTabMeta(data, isResume = false) {
    if (!data || !data.general) return;

    // 1. Browser Tab Title (Top Name)
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

    // 2. Favicon (Browser Tab Icon)
    // "name vahi bus imge change": Static standard favicon links in HTML are natively resolved.
    // If a live data: URI or custom path is active, update the primary icon smoothly without breaking apple-touch-icon.
    if (data.general.favicon && (data.general.favicon.startsWith("data:") || !data.general.favicon.includes("favicon-32x32.png"))) {
      const favUrl = formatImageUrl(data.general.favicon, data._updatedAt);
      let standardIcon = document.querySelector("link[rel='icon']:not([sizes]), link[rel='icon'][sizes='32x32']");
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
        : (data.general.profilePic ? [data.general.profilePic] : ["assets/profile/2.jpg"]);

      window.__portfolioAvatars = avList;

      const activePic = data.general.profilePic || avList[0];
      const startIdx = avList.indexOf(activePic);
      window.__currentAvatarIdx = startIdx >= 0 ? startIdx : 0;

      if (profilePic && activePic) {
        profilePic.src = formatImageUrl(activePic, data._updatedAt);
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
          firstP.innerHTML = data.about.bio;
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
                .map((item) => `<li>${item.text || item.html || ""}</li>`)
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
                      `<span title="${escapeHtml(t.name)}"><i class="${escapeHtml(
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
              <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(p.title)}" loading="lazy" />
              <div class="card-content">
                <b>${escapeHtml(p.title)}</b>
                <p>${p.description}</p>
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

    // 4. Blog Posts Showcase (if updated)
    if (Array.isArray(data.blog) && data.blog.length > 0) {
      const blogCardsContainer = document.querySelector("#blog .blog-cards");
      if (blogCardsContainer) {
        blogCardsContainer.innerHTML = data.blog
          .map((b) => {
            const tags = Array.isArray(b.tags)
              ? b.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")
              : "";
            const blogImg = formatImageUrl(b.image || "", data._updatedAt);
            return `
            <article class="blog-card" data-blog-id="${escapeHtml(b.id || "")}">
              <a href="${escapeHtml(b.url || "#")}" class="blog-card-link" target="_blank" rel="noopener noreferrer" aria-label="Read ${escapeHtml(b.title)}">
                <img src="${escapeHtml(blogImg)}" alt="${escapeHtml(b.title)}" />
                <div class="blog-card-content">
                  <p class="blog-date">${escapeHtml(b.date || "")}</p>
                  <h3>${escapeHtml(b.title)}</h3>
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
  }

  // Hydrate Resume Page
  function renderResumePage(data) {
    if (!data || !data.resume) return;

    updateBrowserTabMeta(data, true);

    const r = data.resume;

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

    // 2. Sections
    const sections = document.querySelectorAll(".resume-sheet > section");
    sections.forEach((sec) => {
      const h2 = sec.querySelector("h2");
      if (!h2) return;
      const title = h2.textContent.trim().toLowerCase();

      // Introduction
      if (title.includes("intro") && r.introduction) {
        const p = sec.querySelector("p");
        if (p) p.innerHTML = r.introduction;
      }

      // Experience
      if (title.includes("experience") && Array.isArray(r.experience)) {
        // Keep h2, replace articles
        const articlesHtml = r.experience
          .map(
            (exp) => `
          <article class="entry">
            <div class="entry-heading">
              <h3>${escapeHtml(exp.title || exp.role || "")}</h3>
              <span>${escapeHtml(exp.period || "")}</span>
            </div>
            <ul>
              ${(exp.bullets || []).map((b) => `<li>${b}</li>`).join("")}
            </ul>
          </article>`
          )
          .join("");
        sec.innerHTML = `<h2>Experience</h2>` + articlesHtml;
      }

      // Projects on Resume
      if (title.includes("project") && Array.isArray(r.projects)) {
        const projHtml = r.projects
          .map(
            (p) => `
          <article class="entry">
            <div class="entry-heading">
              <h3>${escapeHtml(p.title)}</h3>
              <span>${escapeHtml(p.meta || p.subtitle || "")}</span>
            </div>
            <p>${p.description || ""}</p>
          </article>`
          )
          .join("");
        sec.innerHTML = `<h2>Some of my (cool?) projects</h2>` + projHtml;
      }

      // Education
      if (title.includes("education") && Array.isArray(r.education)) {
        const eduHtml = r.education
          .map(
            (ed) => `
          <article class="entry">
            <div class="entry-heading">
              <h3>${escapeHtml(ed.institution || "")}</h3>
              <span>${escapeHtml(ed.meta || ed.subtitle || "")}</span>
            </div>
            <p>${ed.description || ""}</p>
          </article>`
          )
          .join("");
        sec.innerHTML = `<h2>Education</h2>` + eduHtml;
      }

      // Recognition
      if (title.includes("recognition") && Array.isArray(r.recognition)) {
        sec.innerHTML =
          `<h2>Recognition</h2><ul>` +
          r.recognition.map((rec) => `<li>${rec}</li>`).join("") +
          `</ul>`;
      }

      // Skills
      if (title.includes("skill") && r.skills) {
        sec.innerHTML = `<h2>Skills</h2><p class="skills">${escapeHtml(r.skills)}</p>`;
      }
    });
  }

  // Master Render
  async function syncAndRender() {
    const data = await loadData();
    if (!data) return;

    if (document.querySelector("#about-me") || document.querySelector("#portfolio")) {
      renderIndexPage(data);
    }
    if (document.querySelector(".resume-sheet")) {
      renderResumePage(data);
    }
  }

  // Initialize
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      syncAndRender();
    });
  } else {
    syncAndRender();
  }

  // Cross-tab live updates
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      if (event.data && event.data.type === "PORTFOLIO_UPDATED") {
        syncAndRender();
      }
    };
  }

  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      syncAndRender();
    }
  });

  // Expose global reload for console / scripts
  window.__refreshPortfolioData = syncAndRender;
})();
