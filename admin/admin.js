/**
 * SAMARTH ADMIN CONTROL SUITE - LOGIC ENGINE
 * Complete state manager, dynamic UI generator, live synchronizer, and exporter.
 */

(function () {
  const STORAGE_KEY = "samarth_portfolio_data";
  const LEGACY_KEY = "samarth_portfolio_data_v1";
  const DATA_URL = "../data/portfolio-data.json";
  const CHANNEL_NAME = "samarth_portfolio_sync";

  let broadcastChannel = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    }
  } catch (e) {
    console.warn("BroadcastChannel unavailable", e);
  }

  // Master State
  let state = {
    general: {},
    about: {},
    projects: [],
    resume: {},
    blog: [],
  };

  let editingProjectIndex = -1;

  // DOM Elements
  const tabLinks = document.querySelectorAll(".admin-nav-link");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const toastContainer = document.getElementById("toast-container");

  // Show Toast
  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icon =
      type === "success"
        ? "fa-check-circle"
        : type === "error"
        ? "fa-triangle-exclamation"
        : "fa-circle-info";
    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(50px)";
      toast.style.transition = "all 0.25s ease";
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Load Data
  async function loadInitialData() {
    let loaded = null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
      if (stored) {
        loaded = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Failed to parse localStorage data", e);
    }

    if (!loaded) {
      try {
        const res = await fetch(DATA_URL + "?v=" + Date.now(), { cache: "no-store" });
        if (res.ok) {
          loaded = await res.json();
        }
      } catch (err) {
        console.error("Failed to fetch default JSON", err);
      }
    }

    if (loaded) {
      state = loaded;
      if (!Array.isArray(state.projects)) state.projects = [];
      if (!state.resume) state.resume = {};
      if (!state.about) state.about = {};
      if (!state.general) state.general = {};
      if (!Array.isArray(state.blog)) state.blog = [];
    }

    renderAllTabs();
    updateCounters();
  }

  // Navigation / Tabs
  tabLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const targetTabId = link.getAttribute("data-tab");
      tabLinks.forEach((l) => l.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));
      link.classList.add("active");
      const targetPane = document.getElementById(targetTabId);
      if (targetPane) targetPane.classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // Counters
  function updateCounters() {
    const projCount = state.projects?.length || 0;
    const navCountProj = document.getElementById("nav-count-projects");
    if (navCountProj) navCountProj.textContent = projCount;
    const titleCountProj = document.getElementById("project-count-title");
    if (titleCountProj) titleCountProj.textContent = projCount;

    const expCount = state.resume?.experience?.length || 0;
    const navCountRes = document.getElementById("nav-count-resume");
    if (navCountRes) navCountRes.textContent = `${expCount} exp`;

    const blogCount = state.blog?.length || 0;
    const navCountBlog = document.getElementById("nav-count-blog");
    if (navCountBlog) navCountBlog.textContent = blogCount;
  }

  // Render All Tabs
  function renderAllTabs() {
    renderProjectsList();
    renderResumeTab();
    renderAboutTab();
    renderHeroTab();
    renderBlogTab();
  }

  // =========================================================================
  // TAB 1: PROJECTS
  // =========================================================================

  function renderProjectsList(filterQuery = "") {
    const container = document.getElementById("projects-list-container");
    if (!container) return;

    const filtered = (state.projects || []).filter((p) => {
      if (!filterQuery) return true;
      const q = filterQuery.toLowerCase();
      return (
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted); font-family: var(--font-mono);">
          <i class="fas fa-box-open fa-2x" style="margin-bottom: 8px;"></i>
          <p>No projects match your query.</p>
        </div>`;
      return;
    }

    container.innerHTML = filtered
      .map((proj, idx) => {
        const actualIndex = state.projects.indexOf(proj);
        const techHtml = Array.isArray(proj.tech)
          ? proj.tech
              .map(
                (t) =>
                  `<span class="tech-tag"><i class="${escapeHtml(t.icon || "fas fa-code")}"></i> ${escapeHtml(
                    t.name
                  )}</span>`
              )
              .join("")
          : "";

        return `
        <div class="project-item-card" data-index="${actualIndex}">
          <div class="item-thumb-wrapper">
            <img class="item-thumb" src="${escapeHtml(proj.image || "../assets/projects/pishot.png")}" alt="${escapeHtml(
          proj.title
        )}" onerror="this.src='../assets/projects/pishot.png'" />
          </div>
          <div class="item-info">
            <div class="item-title-row">
              <span class="item-title">${escapeHtml(proj.title)}</span>
              ${
                proj.visitUrl
                  ? `<a href="${escapeHtml(
                      proj.visitUrl
                    )}" target="_blank" class="btn btn-sm" style="padding: 2px 8px; font-size: 11px;">${escapeHtml(
                      proj.visitLabel || "Visit"
                    )} <i class="fas fa-external-link-alt"></i></a>`
                  : ""
              }
              ${
                proj.sourceUrl
                  ? `<a href="${escapeHtml(
                      proj.sourceUrl
                    )}" target="_blank" class="btn btn-sm" style="padding: 2px 8px; font-size: 11px;"><i class="fab fa-github"></i> Source</a>`
                  : ""
              }
            </div>
            <div class="item-desc-snippet">${proj.description}</div>
            <div class="item-tech-tags">${techHtml}</div>
          </div>
          <div class="item-actions">
            <button type="button" class="btn btn-sm btn-reorder-proj-up" data-index="${actualIndex}" title="Move Up" ${
          actualIndex === 0 ? "disabled style='opacity: 0.3; cursor: not-allowed;'" : ""
        }><i class="fas fa-arrow-up"></i></button>
            <button type="button" class="btn btn-sm btn-reorder-proj-down" data-index="${actualIndex}" title="Move Down" ${
          actualIndex === state.projects.length - 1
            ? "disabled style='opacity: 0.3; cursor: not-allowed;'"
            : ""
        }><i class="fas fa-arrow-down"></i></button>
            <button type="button" class="btn btn-sm btn-yellow btn-edit-proj" data-index="${actualIndex}" title="Edit Project"><i class="fas fa-pen"></i></button>
            <button type="button" class="btn btn-sm btn-danger btn-delete-proj" data-index="${actualIndex}" title="Delete Project"><i class="fas fa-trash"></i></button>
          </div>
        </div>`;
      })
      .join("");

    attachProjectItemListeners();
  }

  function attachProjectItemListeners() {
    document.querySelectorAll(".btn-edit-proj").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        openProjectModal(idx);
      });
    });

    document.querySelectorAll(".btn-delete-proj").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        const proj = state.projects[idx];
        if (confirm(`Are you sure you want to delete "${proj.title}"?`)) {
          state.projects.splice(idx, 1);
          renderProjectsList();
          updateCounters();
          showToast(`Deleted "${proj.title}"`, "info");
        }
      });
    });

    document.querySelectorAll(".btn-reorder-proj-up").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        if (idx > 0) {
          const temp = state.projects[idx];
          state.projects[idx] = state.projects[idx - 1];
          state.projects[idx - 1] = temp;
          renderProjectsList();
        }
      });
    });

    document.querySelectorAll(".btn-reorder-proj-down").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-index"), 10);
        if (idx < state.projects.length - 1) {
          const temp = state.projects[idx];
          state.projects[idx] = state.projects[idx + 1];
          state.projects[idx + 1] = temp;
          renderProjectsList();
        }
      });
    });
  }

  // Project Search
  const searchInput = document.getElementById("project-search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderProjectsList(e.target.value.trim());
    });
  }

  // Project Modal
  const modalProject = document.getElementById("modal-project");
  const modalProjectTitle = document.getElementById("modal-project-title");
  const btnAddProject = document.getElementById("btn-add-project");
  const btnCloseModal = document.getElementById("btn-close-project-modal");
  const btnCancelModal = document.getElementById("btn-cancel-project-modal");
  const btnSaveModal = document.getElementById("btn-save-project-modal");

  const projTitle = document.getElementById("proj-title");
  const projDesc = document.getElementById("proj-desc");
  const projImage = document.getElementById("proj-image");
  const projQuickImg = document.getElementById("proj-quick-image-select");
  const projImageFile = document.getElementById("proj-image-file");
  const projSource = document.getElementById("proj-source");
  const projVisit = document.getElementById("proj-visit");
  const projVisitLabel = document.getElementById("proj-visit-label");
  const projTechContainer = document.getElementById("proj-tech-container");
  const btnAddTech = document.getElementById("btn-add-proj-tech");

  let modalTechBadges = [];

  function openProjectModal(index = -1) {
    editingProjectIndex = index;
    if (index >= 0 && state.projects[index]) {
      const p = state.projects[index];
      modalProjectTitle.textContent = `Edit Project: ${p.title}`;
      projTitle.value = p.title || "";
      projDesc.value = p.description || "";
      projImage.value = p.image || "";
      projSource.value = p.sourceUrl || "";
      projVisit.value = p.visitUrl || "";
      projVisitLabel.value = p.visitLabel || "Visit";
      modalTechBadges = Array.isArray(p.tech) ? JSON.parse(JSON.stringify(p.tech)) : [];
    } else {
      modalProjectTitle.textContent = "Add New Project";
      projTitle.value = "";
      projDesc.value = "";
      projImage.value = "assets/projects/pishot.png";
      projSource.value = "";
      projVisit.value = "";
      projVisitLabel.value = "Visit";
      modalTechBadges = [
        { name: "JavaScript", icon: "fab fa-js" },
        { name: "Node.js", icon: "fab fa-node" },
      ];
    }
    renderModalTechBadges();
    updateModalPreview();
    modalProject.classList.add("active");
  }

  function closeProjectModal() {
    modalProject.classList.remove("active");
    editingProjectIndex = -1;
  }

  if (btnAddProject) btnAddProject.addEventListener("click", () => openProjectModal(-1));
  if (btnCloseModal) btnCloseModal.addEventListener("click", closeProjectModal);
  if (btnCancelModal) btnCancelModal.addEventListener("click", closeProjectModal);

  // Quick image select
  if (projQuickImg) {
    projQuickImg.addEventListener("change", (e) => {
      if (e.target.value) {
        projImage.value = e.target.value;
        updateModalPreview();
      }
    });
  }

  // Upload custom image
  if (projImageFile) {
    projImageFile.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          projImage.value = ev.target.result;
          updateModalPreview();
          showToast("Image loaded into project!", "info");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Tech Badges Builder in Modal
  function renderModalTechBadges() {
    if (!projTechContainer) return;
    projTechContainer.innerHTML = modalTechBadges
      .map(
        (t, idx) => `
      <div style="display: flex; gap: 8px; align-items: center;" data-tech-idx="${idx}">
        <input type="text" class="form-input modal-tech-name" value="${escapeHtml(
          t.name
        )}" placeholder="Name (e.g. React)" style="flex: 1;" />
        <input type="text" class="form-input modal-tech-icon" value="${escapeHtml(
          t.icon
        )}" placeholder="Icon (e.g. fab fa-react)" style="width: 170px;" />
        <span style="width: 32px; text-align: center;"><i class="${escapeHtml(t.icon || "fas fa-code")}"></i></span>
        <button type="button" class="btn btn-sm btn-danger btn-remove-tech" data-tech-idx="${idx}"><i class="fas fa-times"></i></button>
      </div>`
      )
      .join("");

    projTechContainer.querySelectorAll(".modal-tech-name").forEach((input) => {
      input.addEventListener("input", (e) => {
        const idx = parseInt(input.closest("[data-tech-idx]").getAttribute("data-tech-idx"), 10);
        modalTechBadges[idx].name = e.target.value;
        updateModalPreview();
      });
    });

    projTechContainer.querySelectorAll(".modal-tech-icon").forEach((input) => {
      input.addEventListener("input", (e) => {
        const row = input.closest("[data-tech-idx]");
        const idx = parseInt(row.getAttribute("data-tech-idx"), 10);
        modalTechBadges[idx].icon = e.target.value;
        const iconPreview = row.querySelector("span i");
        if (iconPreview) iconPreview.className = e.target.value || "fas fa-code";
        updateModalPreview();
      });
    });

    projTechContainer.querySelectorAll(".btn-remove-tech").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-tech-idx"), 10);
        modalTechBadges.splice(idx, 1);
        renderModalTechBadges();
        updateModalPreview();
      });
    });
  }

  if (btnAddTech) {
    btnAddTech.addEventListener("click", () => {
      modalTechBadges.push({ name: "Tool", icon: "fas fa-code" });
      renderModalTechBadges();
      updateModalPreview();
    });
  }

  // Update Mini Preview
  function updateModalPreview() {
    const prevImg = document.getElementById("prev-img");
    const prevTitle = document.getElementById("prev-title");
    const prevDesc = document.getElementById("prev-desc");
    const prevTech = document.getElementById("prev-tech");
    const prevVisitTxt = document.getElementById("prev-visit-txt");

    if (prevImg) prevImg.src = projImage.value.startsWith("data:") ? projImage.value : `../${projImage.value}`;
    if (prevTitle) prevTitle.textContent = projTitle.value || "Project Title";
    if (prevDesc) prevDesc.innerHTML = projDesc.value || "Project description...";
    if (prevVisitTxt) prevVisitTxt.textContent = projVisitLabel.value || "Visit";

    if (prevTech) {
      prevTech.innerHTML = modalTechBadges
        .map(
          (t) =>
            `<span class="tech-tag"><i class="${escapeHtml(t.icon || "fas fa-code")}"></i> ${escapeHtml(
              t.name
            )}</span>`
        )
        .join("");
    }
  }

  [projTitle, projDesc, projImage, projVisitLabel].forEach((el) => {
    if (el) el.addEventListener("input", updateModalPreview);
  });

  // Save Project in Modal
  if (btnSaveModal) {
    btnSaveModal.addEventListener("click", () => {
      const title = projTitle.value.trim();
      const desc = projDesc.value.trim();
      if (!title) {
        showToast("Please enter a project title", "error");
        projTitle.focus();
        return;
      }

      const projectData = {
        id: title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        title: title,
        description: desc,
        image: projImage.value.trim() || "assets/projects/pishot.png",
        sourceUrl: projSource.value.trim(),
        visitUrl: projVisit.value.trim(),
        visitLabel: projVisitLabel.value.trim() || "Visit",
        featured: true,
        tech: modalTechBadges.filter((t) => t.name.trim() !== ""),
      };

      if (editingProjectIndex >= 0) {
        state.projects[editingProjectIndex] = projectData;
        showToast(`Updated "${title}"`, "success");
      } else {
        state.projects.unshift(projectData);
        showToast(`Added new project "${title}"!`, "success");
      }

      closeProjectModal();
      renderProjectsList();
      updateCounters();
    });
  }

  // =========================================================================
  // TAB 2: RESUME
  // =========================================================================

  function renderResumeTab() {
    const r = state.resume || {};
    const h = r.header || {};

    const resName = document.getElementById("resume-name");
    const resHeadline = document.getElementById("resume-headline");
    const resEyebrow = document.getElementById("resume-eyebrow");
    const resLocation = document.getElementById("resume-location");
    const resIntro = document.getElementById("resume-intro");
    const resSkills = document.getElementById("resume-skills");

    if (resName) resName.value = h.name || state.general?.name || "";
    if (resHeadline) resHeadline.value = h.headline || "";
    if (resEyebrow) resEyebrow.value = h.eyebrow || "resume.txt";
    if (resLocation) resLocation.value = h.location || "";
    if (resIntro) resIntro.value = r.introduction || "";
    if (resSkills) resSkills.value = r.skills || "";

    // Contacts
    renderResumeContacts(h.contacts || []);

    // Experience
    renderResumeExperience(r.experience || []);

    // Projects
    renderResumeProjects(r.projects || []);

    // Education
    renderResumeEducation(r.education || []);

    // Recognition
    renderResumeRecognition(r.recognition || []);
  }

  // Resume Contacts
  function renderResumeContacts(contacts) {
    const container = document.getElementById("resume-contacts-container");
    if (!container) return;
    container.innerHTML = contacts
      .map(
        (c, idx) => `
      <div class="sub-item-card" style="padding: 10px;" data-contact-idx="${idx}">
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="text" class="form-input contact-label" value="${escapeHtml(
            c.label
          )}" placeholder="Label (e.g. Email)" style="width: 140px;" />
          <input type="text" class="form-input contact-url" value="${escapeHtml(
            c.url
          )}" placeholder="URL (e.g. mailto:...)" style="flex: 1;" />
          <input type="text" class="form-input contact-icon" value="${escapeHtml(
            c.icon
          )}" placeholder="Icon" style="width: 140px;" />
          <button type="button" class="btn btn-sm btn-danger btn-remove-contact" data-contact-idx="${idx}"><i class="fas fa-trash"></i></button>
        </div>
      </div>`
      )
      .join("");

    container.querySelectorAll(".contact-label").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-contact-idx]").getAttribute("data-contact-idx"), 10);
        state.resume.header.contacts[idx].label = e.target.value;
      });
    });
    container.querySelectorAll(".contact-url").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-contact-idx]").getAttribute("data-contact-idx"), 10);
        state.resume.header.contacts[idx].url = e.target.value;
      });
    });
    container.querySelectorAll(".contact-icon").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-contact-idx]").getAttribute("data-contact-idx"), 10);
        state.resume.header.contacts[idx].icon = e.target.value;
      });
    });
    container.querySelectorAll(".btn-remove-contact").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-contact-idx"), 10);
        state.resume.header.contacts.splice(idx, 1);
        renderResumeContacts(state.resume.header.contacts);
      });
    });
  }

  const btnAddResumeContact = document.getElementById("btn-add-resume-contact");
  if (btnAddResumeContact) {
    btnAddResumeContact.addEventListener("click", () => {
      if (!state.resume.header) state.resume.header = {};
      if (!Array.isArray(state.resume.header.contacts)) state.resume.header.contacts = [];
      state.resume.header.contacts.push({ label: "New Link", url: "https://", icon: "fas fa-link" });
      renderResumeContacts(state.resume.header.contacts);
    });
  }

  // Resume Experience
  function renderResumeExperience(list) {
    const container = document.getElementById("resume-experience-container");
    if (!container) return;
    container.innerHTML = list
      .map(
        (exp, idx) => `
      <div class="sub-item-card" data-exp-idx="${idx}">
        <div class="sub-item-header">
          <span style="font-family: var(--font-anton); font-size: 16px;">#${idx + 1}: ${escapeHtml(
          exp.title || "Experience Entry"
        )}</span>
          <div style="display: flex; gap: 6px;">
            <button type="button" class="btn btn-sm btn-reorder-exp-up" data-exp-idx="${idx}" ${
          idx === 0 ? "disabled" : ""
        }><i class="fas fa-arrow-up"></i></button>
            <button type="button" class="btn btn-sm btn-reorder-exp-down" data-exp-idx="${idx}" ${
          idx === list.length - 1 ? "disabled" : ""
        }><i class="fas fa-arrow-down"></i></button>
            <button type="button" class="btn btn-sm btn-danger btn-remove-exp" data-exp-idx="${idx}"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Role &amp; Organization</label>
            <input type="text" class="form-input exp-title-input" value="${escapeHtml(
              exp.title || ""
            )}" />
          </div>
          <div class="form-group">
            <label class="form-label">Period &amp; Type</label>
            <input type="text" class="form-input exp-period-input" value="${escapeHtml(
              exp.period || ""
            )}" placeholder="e.g. 2024 - Present · Remote" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">
            <span>Bullet Points (HTML allowed)</span>
            <button type="button" class="btn btn-sm btn-yellow btn-add-exp-bullet" data-exp-idx="${idx}"><i class="fas fa-plus"></i> Add Bullet</button>
          </label>
          <div class="bullets-list">
            ${(exp.bullets || [])
              .map(
                (b, bIdx) => `
              <div class="bullet-row" data-bullet-idx="${bIdx}">
                <textarea class="form-textarea exp-bullet-input" rows="2">${b}</textarea>
                <button type="button" class="btn btn-sm btn-danger btn-remove-exp-bullet" data-bullet-idx="${bIdx}"><i class="fas fa-times"></i></button>
              </div>`
              )
              .join("")}
          </div>
        </div>
      </div>`
      )
      .join("");

    // Bind inputs
    container.querySelectorAll(".exp-title-input").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-exp-idx]").getAttribute("data-exp-idx"), 10);
        state.resume.experience[idx].title = e.target.value;
      });
    });
    container.querySelectorAll(".exp-period-input").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-exp-idx]").getAttribute("data-exp-idx"), 10);
        state.resume.experience[idx].period = e.target.value;
      });
    });

    container.querySelectorAll(".exp-bullet-input").forEach((textarea) => {
      textarea.addEventListener("input", (e) => {
        const expIdx = parseInt(
          textarea.closest("[data-exp-idx]").getAttribute("data-exp-idx"),
          10
        );
        const bIdx = parseInt(
          textarea.closest("[data-bullet-idx]").getAttribute("data-bullet-idx"),
          10
        );
        state.resume.experience[expIdx].bullets[bIdx] = e.target.value;
      });
    });

    container.querySelectorAll(".btn-add-exp-bullet").forEach((btn) => {
      btn.addEventListener("click", () => {
        const expIdx = parseInt(btn.getAttribute("data-exp-idx"), 10);
        if (!state.resume.experience[expIdx].bullets) state.resume.experience[expIdx].bullets = [];
        state.resume.experience[expIdx].bullets.push("New accomplishment or detail...");
        renderResumeExperience(state.resume.experience);
      });
    });

    container.querySelectorAll(".btn-remove-exp-bullet").forEach((btn) => {
      btn.addEventListener("click", () => {
        const expIdx = parseInt(btn.closest("[data-exp-idx]").getAttribute("data-exp-idx"), 10);
        const bIdx = parseInt(btn.getAttribute("data-bullet-idx"), 10);
        state.resume.experience[expIdx].bullets.splice(bIdx, 1);
        renderResumeExperience(state.resume.experience);
      });
    });

    container.querySelectorAll(".btn-remove-exp").forEach((btn) => {
      btn.addEventListener("click", () => {
        const expIdx = parseInt(btn.getAttribute("data-exp-idx"), 10);
        state.resume.experience.splice(expIdx, 1);
        renderResumeExperience(state.resume.experience);
        updateCounters();
      });
    });

    container.querySelectorAll(".btn-reorder-exp-up").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-exp-idx"), 10);
        if (idx > 0) {
          const temp = state.resume.experience[idx];
          state.resume.experience[idx] = state.resume.experience[idx - 1];
          state.resume.experience[idx - 1] = temp;
          renderResumeExperience(state.resume.experience);
        }
      });
    });

    container.querySelectorAll(".btn-reorder-exp-down").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-exp-idx"), 10);
        if (idx < state.resume.experience.length - 1) {
          const temp = state.resume.experience[idx];
          state.resume.experience[idx] = state.resume.experience[idx + 1];
          state.resume.experience[idx + 1] = temp;
          renderResumeExperience(state.resume.experience);
        }
      });
    });
  }

  const btnAddExp = document.getElementById("btn-add-experience");
  if (btnAddExp) {
    btnAddExp.addEventListener("click", () => {
      if (!Array.isArray(state.resume.experience)) state.resume.experience = [];
      state.resume.experience.push({
        id: "exp-" + Date.now(),
        title: "Company / Project — Role",
        period: "2026 · Remote",
        bullets: ["Led technical development and built core systems."],
      });
      renderResumeExperience(state.resume.experience);
      updateCounters();
    });
  }

  // Resume Projects
  function renderResumeProjects(list) {
    const container = document.getElementById("resume-projects-container");
    if (!container) return;
    container.innerHTML = list
      .map(
        (p, idx) => `
      <div class="sub-item-card" data-proj-idx="${idx}">
        <div class="sub-item-header">
          <span style="font-family: var(--font-anton); font-size: 16px;">${escapeHtml(
            p.title || "Resume Project"
          )}</span>
          <button type="button" class="btn btn-sm btn-danger btn-remove-res-proj" data-proj-idx="${idx}"><i class="fas fa-trash"></i></button>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Project Title</label>
            <input type="text" class="form-input res-p-title" value="${escapeHtml(p.title || "")}" />
          </div>
          <div class="form-group">
            <label class="form-label">Year &amp; Tech Tag</label>
            <input type="text" class="form-input res-p-meta" value="${escapeHtml(
              p.meta || ""
            )}" placeholder="e.g. 2026 · React, Node.js" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Description (HTML allowed)</label>
          <textarea class="form-textarea res-p-desc" rows="2">${p.description || ""}</textarea>
        </div>
      </div>`
      )
      .join("");

    container.querySelectorAll(".res-p-title").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-proj-idx]").getAttribute("data-proj-idx"), 10);
        state.resume.projects[idx].title = e.target.value;
      });
    });
    container.querySelectorAll(".res-p-meta").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-proj-idx]").getAttribute("data-proj-idx"), 10);
        state.resume.projects[idx].meta = e.target.value;
      });
    });
    container.querySelectorAll(".res-p-desc").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-proj-idx]").getAttribute("data-proj-idx"), 10);
        state.resume.projects[idx].description = e.target.value;
      });
    });
    container.querySelectorAll(".btn-remove-res-proj").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-proj-idx"), 10);
        state.resume.projects.splice(idx, 1);
        renderResumeProjects(state.resume.projects);
      });
    });
  }

  const btnAddResProj = document.getElementById("btn-add-resume-project");
  if (btnAddResProj) {
    btnAddResProj.addEventListener("click", () => {
      if (!Array.isArray(state.resume.projects)) state.resume.projects = [];
      state.resume.projects.push({
        id: "rp-" + Date.now(),
        title: "New Project",
        meta: "2026 · Tech Stack",
        description: "Built and open-sourced a high-performance system.",
      });
      renderResumeProjects(state.resume.projects);
    });
  }

  // Resume Education
  function renderResumeEducation(list) {
    const container = document.getElementById("resume-education-container");
    if (!container) return;
    container.innerHTML = list
      .map(
        (ed, idx) => `
      <div class="sub-item-card" data-edu-idx="${idx}">
        <div class="sub-item-header">
          <span style="font-family: var(--font-anton); font-size: 16px;">${escapeHtml(
            ed.institution || "School / Institution"
          )}</span>
          <button type="button" class="btn btn-sm btn-danger btn-remove-edu" data-edu-idx="${idx}"><i class="fas fa-trash"></i></button>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Institution Name</label>
            <input type="text" class="form-input edu-inst" value="${escapeHtml(
              ed.institution || ""
            )}" />
          </div>
          <div class="form-group">
            <label class="form-label">Program &amp; Dates</label>
            <input type="text" class="form-input edu-meta" value="${escapeHtml(
              ed.meta || ""
            )}" placeholder="e.g. O Levels · 2021 - 2024" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Grades / Accomplishments</label>
          <input type="text" class="form-input edu-desc" value="${escapeHtml(
            ed.description || ""
          )}" />
        </div>
      </div>`
      )
      .join("");

    container.querySelectorAll(".edu-inst").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-edu-idx]").getAttribute("data-edu-idx"), 10);
        state.resume.education[idx].institution = e.target.value;
      });
    });
    container.querySelectorAll(".edu-meta").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-edu-idx]").getAttribute("data-edu-idx"), 10);
        state.resume.education[idx].meta = e.target.value;
      });
    });
    container.querySelectorAll(".edu-desc").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-edu-idx]").getAttribute("data-edu-idx"), 10);
        state.resume.education[idx].description = e.target.value;
      });
    });
    container.querySelectorAll(".btn-remove-edu").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-edu-idx"), 10);
        state.resume.education.splice(idx, 1);
        renderResumeEducation(state.resume.education);
      });
    });
  }

  const btnAddEdu = document.getElementById("btn-add-education");
  if (btnAddEdu) {
    btnAddEdu.addEventListener("click", () => {
      if (!Array.isArray(state.resume.education)) state.resume.education = [];
      state.resume.education.push({
        id: "edu-" + Date.now(),
        institution: "High School / University",
        meta: "2024 - 2026",
        description: "<b>Straight A's</b> and honors.",
      });
      renderResumeEducation(state.resume.education);
    });
  }

  // Resume Recognition
  function renderResumeRecognition(list) {
    const container = document.getElementById("resume-recognition-container");
    if (!container) return;
    container.innerHTML = list
      .map(
        (rec, idx) => `
      <div style="display: flex; gap: 8px; align-items: center;" data-rec-idx="${idx}">
        <textarea class="form-textarea rec-input" rows="2" style="flex: 1;">${rec}</textarea>
        <button type="button" class="btn btn-sm btn-danger btn-remove-rec" data-rec-idx="${idx}"><i class="fas fa-trash"></i></button>
      </div>`
      )
      .join("");

    container.querySelectorAll(".rec-input").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-rec-idx]").getAttribute("data-rec-idx"), 10);
        state.resume.recognition[idx] = e.target.value;
      });
    });
    container.querySelectorAll(".btn-remove-rec").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-rec-idx"), 10);
        state.resume.recognition.splice(idx, 1);
        renderResumeRecognition(state.resume.recognition);
      });
    });
  }

  const btnAddRec = document.getElementById("btn-add-recognition");
  if (btnAddRec) {
    btnAddRec.addEventListener("click", () => {
      if (!Array.isArray(state.resume.recognition)) state.resume.recognition = [];
      state.resume.recognition.push("Won <b>1st place</b> in international hackathon.");
      renderResumeRecognition(state.resume.recognition);
    });
  }

  // Listeners for top-level resume inputs
  ["resume-name", "resume-headline", "resume-eyebrow", "resume-location"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        if (!state.resume.header) state.resume.header = {};
        state.resume.header[id.replace("resume-", "")] = el.value;
      });
    }
  });

  const resIntroEl = document.getElementById("resume-intro");
  if (resIntroEl) {
    resIntroEl.addEventListener("input", (e) => {
      state.resume.introduction = e.target.value;
    });
  }

  const resSkillsEl = document.getElementById("resume-skills");
  if (resSkillsEl) {
    resSkillsEl.addEventListener("input", (e) => {
      state.resume.skills = e.target.value;
    });
  }

  // =========================================================================
  // TAB 3: ABOUT ME
  // =========================================================================

  function renderAboutTab() {
    const a = state.about || {};
    const bioEl = document.getElementById("about-bio");
    const userEl = document.getElementById("about-hackatime-user");
    const codingStatsEl = document.getElementById("about-show-coding-stats");

    if (bioEl) bioEl.value = a.bio || "";
    if (userEl) userEl.value = a.hackatimeUser || "Samarth";
    if (codingStatsEl) codingStatsEl.checked = a.showCodingStats !== false;

    renderAboutHighlights(a.highlights || []);
    renderAboutSkillCategories(a.skillsCategories || []);
  }

  function renderAboutHighlights(highlights) {
    const container = document.getElementById("about-highlights-container");
    if (!container) return;
    container.innerHTML = highlights
      .map(
        (item, idx) => `
      <div class="sub-item-card" data-hl-idx="${idx}">
        <div class="sub-item-header">
          <span style="font-family: var(--font-anton); font-size: 15px;">Highlight #${idx + 1}</span>
          <button type="button" class="btn btn-sm btn-danger btn-remove-hl" data-hl-idx="${idx}"><i class="fas fa-trash"></i></button>
        </div>
        <textarea class="form-textarea hl-text-input" rows="2">${item.text || item.html || ""}</textarea>
      </div>`
      )
      .join("");

    container.querySelectorAll(".hl-text-input").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-hl-idx]").getAttribute("data-hl-idx"), 10);
        state.about.highlights[idx].text = e.target.value;
      });
    });

    container.querySelectorAll(".btn-remove-hl").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-hl-idx"), 10);
        state.about.highlights.splice(idx, 1);
        renderAboutHighlights(state.about.highlights);
      });
    });
  }

  const btnAddHl = document.getElementById("btn-add-highlight");
  if (btnAddHl) {
    btnAddHl.addEventListener("click", () => {
      if (!Array.isArray(state.about.highlights)) state.about.highlights = [];
      state.about.highlights.push({
        id: "hl-" + Date.now(),
        text: "Built a game/project with 10k+ users worldwide.",
      });
      renderAboutHighlights(state.about.highlights);
    });
  }

  function renderAboutSkillCategories(cats) {
    const container = document.getElementById("about-skill-categories-container");
    if (!container) return;
    container.innerHTML = cats
      .map(
        (cat, idx) => `
      <div class="sub-item-card" data-cat-idx="${idx}">
        <div class="sub-item-header">
          <span style="font-family: var(--font-anton); font-size: 15px;">Category #${idx + 1}</span>
          <button type="button" class="btn btn-sm btn-danger btn-remove-cat" data-cat-idx="${idx}"><i class="fas fa-trash"></i></button>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Category Name</label>
            <input type="text" class="form-input cat-name-input" value="${escapeHtml(
              cat.category || ""
            )}" placeholder="e.g. Hardware" />
          </div>
          <div class="form-group" style="grid-column: 1 / -1;">
            <label class="form-label">Skills List (Comma separated)</label>
            <input type="text" class="form-input cat-skills-input" value="${escapeHtml(
              cat.skills || ""
            )}" placeholder="e.g. Raspberry Pi, Arduino, CircuitPython" />
          </div>
        </div>
      </div>`
      )
      .join("");

    container.querySelectorAll(".cat-name-input").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-cat-idx]").getAttribute("data-cat-idx"), 10);
        state.about.skillsCategories[idx].category = e.target.value;
      });
    });

    container.querySelectorAll(".cat-skills-input").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-cat-idx]").getAttribute("data-cat-idx"), 10);
        state.about.skillsCategories[idx].skills = e.target.value;
      });
    });

    container.querySelectorAll(".btn-remove-cat").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-cat-idx"), 10);
        state.about.skillsCategories.splice(idx, 1);
        renderAboutSkillCategories(state.about.skillsCategories);
      });
    });
  }

  const btnAddCat = document.getElementById("btn-add-skill-category");
  if (btnAddCat) {
    btnAddCat.addEventListener("click", () => {
      if (!Array.isArray(state.about.skillsCategories)) state.about.skillsCategories = [];
      state.about.skillsCategories.push({
        category: "New Category",
        skills: "Skill 1, Skill 2, Skill 3",
      });
      renderAboutSkillCategories(state.about.skillsCategories);
    });
  }

  const bioInput = document.getElementById("about-bio");
  if (bioInput) {
    bioInput.addEventListener("input", (e) => {
      state.about.bio = e.target.value;
    });
  }

  const userHackatime = document.getElementById("about-hackatime-user");
  if (userHackatime) {
    userHackatime.addEventListener("input", (e) => {
      state.about.hackatimeUser = e.target.value;
    });
  }

  const showStatsBox = document.getElementById("about-show-coding-stats");
  if (showStatsBox) {
    showStatsBox.addEventListener("change", (e) => {
      state.about.showCodingStats = e.target.checked;
    });
  }

  // =========================================================================
  // TAB 4: HERO & GENERAL
  // =========================================================================

  function renderHeroTab() {
    const g = state.general || {};

    const nameEl = document.getElementById("hero-name");
    const shortNameEl = document.getElementById("hero-short-name");
    const descEl = document.getElementById("hero-description");
    const ctaTextEl = document.getElementById("hero-cta-text");
    const ctaSubtextEl = document.getElementById("hero-cta-subtext");
    const picEl = document.getElementById("hero-profile-pic");
    const picPrev = document.getElementById("hero-avatar-preview");

    if (nameEl) nameEl.value = g.name || "";
    if (shortNameEl) shortNameEl.value = g.shortName || "";
    if (descEl) descEl.value = g.description || "";
    if (ctaTextEl) ctaTextEl.value = g.ctaText || "Explore projects";
    if (ctaSubtextEl) ctaSubtextEl.value = g.ctaSubtext || "[All my work is open source]";
    if (picEl) picEl.value = g.profilePic || "assets/profile/2.jpg";
    if (picPrev) {
      picPrev.src = g.profilePic?.startsWith("data:") ? g.profilePic : `../${g.profilePic || "assets/profile/2.jpg"}`;
    }

    renderHeroSocials(g.socials || []);
  }

  function renderHeroSocials(socials) {
    const container = document.getElementById("hero-socials-container");
    if (!container) return;
    container.innerHTML = socials
      .map(
        (s, idx) => `
      <div style="display: flex; gap: 8px; align-items: center;" data-social-idx="${idx}">
        <input type="text" class="form-input soc-name" value="${escapeHtml(
          s.name
        )}" placeholder="Name (e.g. GitHub)" style="width: 140px;" />
        <input type="text" class="form-input soc-url" value="${escapeHtml(
          s.url
        )}" placeholder="URL" style="flex: 1;" />
        <input type="text" class="form-input soc-icon" value="${escapeHtml(
          s.icon
        )}" placeholder="Icon" style="width: 150px;" />
        <span style="width: 30px; text-align: center;"><i class="${escapeHtml(s.icon || "fas fa-link")}"></i></span>
        <button type="button" class="btn btn-sm btn-danger btn-remove-soc" data-social-idx="${idx}"><i class="fas fa-trash"></i></button>
      </div>`
      )
      .join("");

    container.querySelectorAll(".soc-name").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-social-idx]").getAttribute("data-social-idx"), 10);
        state.general.socials[idx].name = e.target.value;
      });
    });
    container.querySelectorAll(".soc-url").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-social-idx]").getAttribute("data-social-idx"), 10);
        state.general.socials[idx].url = e.target.value;
      });
    });
    container.querySelectorAll(".soc-icon").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const row = inp.closest("[data-social-idx]");
        const idx = parseInt(row.getAttribute("data-social-idx"), 10);
        state.general.socials[idx].icon = e.target.value;
        const iconPreview = row.querySelector("span i");
        if (iconPreview) iconPreview.className = e.target.value || "fas fa-link";
      });
    });
    container.querySelectorAll(".btn-remove-soc").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-social-idx"), 10);
        state.general.socials.splice(idx, 1);
        renderHeroSocials(state.general.socials);
      });
    });
  }

  const btnAddSoc = document.getElementById("btn-add-social");
  if (btnAddSoc) {
    btnAddSoc.addEventListener("click", () => {
      if (!Array.isArray(state.general.socials)) state.general.socials = [];
      state.general.socials.push({
        name: "Twitter/X",
        url: "https://x.com/",
        icon: "fab fa-x-twitter",
      });
      renderHeroSocials(state.general.socials);
    });
  }

  // Quick avatar buttons
  document.querySelectorAll(".btn-quick-avatar").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = btn.getAttribute("data-path");
      const picEl = document.getElementById("hero-profile-pic");
      const picPrev = document.getElementById("hero-avatar-preview");
      if (picEl) picEl.value = p;
      if (picPrev) picPrev.src = `../${p}`;
      state.general.profilePic = p;
      showToast(`Selected avatar ${btn.textContent}`, "info");
    });
  });

  const heroAvatarUpload = document.getElementById("hero-avatar-upload");
  if (heroAvatarUpload) {
    heroAvatarUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const picEl = document.getElementById("hero-profile-pic");
          const picPrev = document.getElementById("hero-avatar-preview");
          if (picEl) picEl.value = ev.target.result;
          if (picPrev) picPrev.src = ev.target.result;
          state.general.profilePic = ev.target.result;
          showToast("Profile image updated!", "success");
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Bind hero inputs
  ["hero-name", "hero-short-name", "hero-description", "hero-cta-text", "hero-cta-subtext", "hero-profile-pic"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", () => {
          const key = id.replace("hero-", "").replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
          state.general[key] = el.value;
          if (id === "hero-profile-pic") {
            const picPrev = document.getElementById("hero-avatar-preview");
            if (picPrev) {
              picPrev.src = el.value.startsWith("data:") ? el.value : `../${el.value}`;
            }
          }
        });
      }
    }
  );

  // =========================================================================
  // TAB 5: BLOG
  // =========================================================================

  function renderBlogTab() {
    const container = document.getElementById("blog-cards-container");
    if (!container) return;
    const blogList = state.blog || [];
    container.innerHTML = blogList
      .map(
        (b, idx) => `
      <div class="sub-item-card" data-blog-idx="${idx}">
        <div class="sub-item-header">
          <span style="font-family: var(--font-anton); font-size: 16px;">${escapeHtml(
            b.title || "Blog Post"
          )}</span>
          <button type="button" class="btn btn-sm btn-danger btn-remove-blog" data-blog-idx="${idx}"><i class="fas fa-trash"></i></button>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Article Title</label>
            <input type="text" class="form-input b-title" value="${escapeHtml(b.title || "")}" />
          </div>
          <div class="form-group">
            <label class="form-label">Publish Date</label>
            <input type="text" class="form-input b-date" value="${escapeHtml(b.date || "")}" />
          </div>
          <div class="form-group">
            <label class="form-label">Article URL</label>
            <input type="text" class="form-input b-url" value="${escapeHtml(b.url || "")}" />
          </div>
          <div class="form-group">
            <label class="form-label">Image Thumbnail URL</label>
            <input type="text" class="form-input b-image" value="${escapeHtml(b.image || "")}" />
          </div>
          <div class="form-group full-width">
            <label class="form-label">Excerpt / Description</label>
            <input type="text" class="form-input b-desc" value="${escapeHtml(b.description || "")}" />
          </div>
          <div class="form-group full-width">
            <label class="form-label">Tags (comma separated)</label>
            <input type="text" class="form-input b-tags" value="${escapeHtml(
              (b.tags || []).join(", ")
            )}" />
          </div>
        </div>
      </div>`
      )
      .join("");

    container.querySelectorAll(".b-title").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-blog-idx]").getAttribute("data-blog-idx"), 10);
        state.blog[idx].title = e.target.value;
      });
    });
    container.querySelectorAll(".b-date").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-blog-idx]").getAttribute("data-blog-idx"), 10);
        state.blog[idx].date = e.target.value;
      });
    });
    container.querySelectorAll(".b-url").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-blog-idx]").getAttribute("data-blog-idx"), 10);
        state.blog[idx].url = e.target.value;
      });
    });
    container.querySelectorAll(".b-image").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-blog-idx]").getAttribute("data-blog-idx"), 10);
        state.blog[idx].image = e.target.value;
      });
    });
    container.querySelectorAll(".b-desc").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-blog-idx]").getAttribute("data-blog-idx"), 10);
        state.blog[idx].description = e.target.value;
      });
    });
    container.querySelectorAll(".b-tags").forEach((inp) => {
      inp.addEventListener("input", (e) => {
        const idx = parseInt(inp.closest("[data-blog-idx]").getAttribute("data-blog-idx"), 10);
        state.blog[idx].tags = e.target.value
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      });
    });

    container.querySelectorAll(".btn-remove-blog").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.getAttribute("data-blog-idx"), 10);
        state.blog.splice(idx, 1);
        renderBlogTab();
        updateCounters();
      });
    });
  }

  const btnAddBlog = document.getElementById("btn-add-blog-card");
  if (btnAddBlog) {
    btnAddBlog.addEventListener("click", () => {
      if (!Array.isArray(state.blog)) state.blog = [];
      state.blog.push({
        id: "post-" + Date.now(),
        title: "New Journal Entry",
        date: "October 2026",
        description: "Article overview and technical insights.",
        url: "/blog/",
        image: "assets/blog/i-made-a-custom-raspberry-pi-camera.png",
        tags: ["tech", "coding"],
      });
      renderBlogTab();
      updateCounters();
    });
  }

  // =========================================================================
  // MASTER SAVE & PERSISTENCE
  // =========================================================================

  async function performMasterSave() {
    try {
      const serialized = JSON.stringify(state, null, 2);
      localStorage.setItem(STORAGE_KEY, serialized);

      // Notify other tabs via BroadcastChannel
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: "PORTFOLIO_UPDATED", timestamp: Date.now() });
      }

      // Try local server API if running
      let serverSaved = false;
      try {
        const res = await fetch("/api/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: serialized,
        });
        if (res.ok) {
          serverSaved = true;
        }
      } catch (e) {
        // Static server running
      }

      if (serverSaved) {
        showToast("Changes saved to disk & portfolio updated live!", "success");
      } else {
        showToast("Changes applied live in browser! (To sync file, use 'Save to Project File')", "success");
      }

      // Pulse save button
      const btnSave = document.getElementById("btn-save-master");
      if (btnSave) {
        btnSave.classList.add("btn-yellow");
        setTimeout(() => btnSave.classList.remove("btn-yellow"), 600);
      }
    } catch (err) {
      console.error("Save error", err);
      showToast("Error saving data: " + err.message, "error");
    }
  }

  const btnSaveMaster = document.getElementById("btn-save-master");
  if (btnSaveMaster) btnSaveMaster.addEventListener("click", performMasterSave);

  // Keyboard shortcut Ctrl+S or Cmd+S
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      performMasterSave();
    }
  });

  // Direct Save to Project File (File System Access or API or Download)
  async function saveDirectToDisk() {
    const jsonStr = JSON.stringify(state, null, 2);

    // 1. Try server API first
    try {
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonStr,
      });
      if (res.ok) {
        showToast("Successfully written directly to data/portfolio-data.json on disk!", "success");
        return;
      }
    } catch (e) {
      // server not listening on /api/save
    }

    // 2. Try modern File System Access API
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: "portfolio-data.json",
          types: [
            {
              description: "JSON Data File",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
        showToast("Saved file successfully!", "success");
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }

    // 3. Fallback: Trigger download
    downloadJsonFile();
  }

  const btnDirectDisk = document.getElementById("btn-direct-disk-save");
  const btnSaveDiskAction = document.getElementById("btn-save-disk-action");
  if (btnDirectDisk) btnDirectDisk.addEventListener("click", saveDirectToDisk);
  if (btnSaveDiskAction) btnSaveDiskAction.addEventListener("click", saveDirectToDisk);

  // Download JSON
  function downloadJsonFile() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "portfolio-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Downloaded portfolio-data.json", "info");
  }

  const btnDownJson = document.getElementById("btn-download-json");
  const btnDownQuick = document.getElementById("btn-download-json-quick");
  if (btnDownJson) btnDownJson.addEventListener("click", downloadJsonFile);
  if (btnDownQuick) btnDownQuick.addEventListener("click", downloadJsonFile);

  // Copy JSON to Clipboard
  const btnCopyJson = document.getElementById("btn-copy-json");
  if (btnCopyJson) {
    btnCopyJson.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(JSON.stringify(state, null, 2));
        showToast("JSON copied to clipboard!", "success");
      } catch (e) {
        showToast("Failed to copy to clipboard", "error");
      }
    });
  }

  // Import JSON File
  const inputImportJson = document.getElementById("input-import-json");
  if (inputImportJson) {
    inputImportJson.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const imported = JSON.parse(ev.target.result);
            if (imported && (imported.projects || imported.resume || imported.about)) {
              state = imported;
              renderAllTabs();
              updateCounters();
              performMasterSave();
              showToast("Data imported and saved successfully!", "success");
            } else {
              showToast("Invalid portfolio data format", "error");
            }
          } catch (err) {
            showToast("Failed to parse JSON file", "error");
          }
        };
        reader.readAsText(file);
      }
    });
  }

  // Factory Reset
  const btnReset = document.getElementById("btn-reset-defaults");
  if (btnReset) {
    btnReset.addEventListener("click", async () => {
      if (
        confirm(
          "Are you sure you want to revert all customizations back to factory defaults? Any unsaved edits will be lost."
        )
      ) {
        localStorage.removeItem(STORAGE_KEY);
        try {
          const res = await fetch(DATA_URL + "?v=" + Date.now(), { cache: "no-store" });
          if (res.ok) {
            state = await res.json();
            renderAllTabs();
            updateCounters();
            if (broadcastChannel) {
              broadcastChannel.postMessage({ type: "PORTFOLIO_UPDATED", timestamp: Date.now() });
            }
            showToast("Reverted to factory defaults", "info");
          }
        } catch (err) {
          showToast("Failed to reload default data", "error");
        }
      }
    });
  }

  // Theme Toggle
  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener("click", () => {
      const isDark = document.body.classList.contains("dark");
      if (isDark) {
        document.body.classList.remove("dark");
        document.body.classList.add("light");
        localStorage.setItem("theme", "light");
      } else {
        document.body.classList.remove("light");
        document.body.classList.add("dark");
        localStorage.setItem("theme", "dark");
      }
      updateThemeIcon();
    });
  }

  function updateThemeIcon() {
    const icon = document.getElementById("theme-toggle-icon");
    if (icon) {
      icon.className = document.body.classList.contains("dark") ? "fas fa-sun" : "fas fa-moon";
    }
  }

  // GitHub & Vercel Auto-Deploy
  const ghRepoInput = document.getElementById("gh-repo");
  const ghBranchInput = document.getElementById("gh-branch");
  const ghTokenInput = document.getElementById("gh-token");
  const btnGhSave = document.getElementById("btn-gh-save-config");
  const btnGhDeploy = document.getElementById("btn-gh-deploy");

  // Load saved credentials
  if (ghRepoInput) ghRepoInput.value = localStorage.getItem("gh_deploy_repo") || "samarth163-cloud/Samarthhh";
  if (ghBranchInput) ghBranchInput.value = localStorage.getItem("gh_deploy_branch") || "main";
  if (ghTokenInput) ghTokenInput.value = localStorage.getItem("gh_deploy_token") || "";

  if (btnGhSave) {
    btnGhSave.addEventListener("click", () => {
      localStorage.setItem("gh_deploy_repo", (ghRepoInput?.value || "").trim());
      localStorage.setItem("gh_deploy_branch", (ghBranchInput?.value || "").trim() || "main");
      localStorage.setItem("gh_deploy_token", (ghTokenInput?.value || "").trim());
      showToast("GitHub credentials saved locally!", "success");
    });
  }

  if (btnGhDeploy) {
    btnGhDeploy.addEventListener("click", async () => {
      const repo = (ghRepoInput?.value || "").trim();
      const branch = (ghBranchInput?.value || "").trim() || "main";
      const token = (ghTokenInput?.value || "").trim();

      if (!repo || !token) {
        showToast("Please enter your GitHub Repo and Personal Access Token (PAT)", "error");
        return;
      }

      btnGhDeploy.disabled = true;
      btnGhDeploy.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Committing to GitHub...`;

      try {
        const filePath = "data/portfolio-data.json";
        const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}?ref=${branch}`;

        // 1. Get current file SHA if exists
        let currentSha = null;
        try {
          const checkRes = await fetch(apiUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/vnd.github.v3+json",
            },
          });
          if (checkRes.ok) {
            const fileData = await checkRes.json();
            currentSha = fileData.sha;
          }
        } catch (e) {
          // File might be new
        }

        // 2. Prepare UTF-8 Base64 content
        const jsonString = JSON.stringify(state, null, 2);
        const encodedContent = btoa(unescape(encodeURIComponent(jsonString)));

        // 3. Commit to GitHub
        const commitRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: "Update portfolio content via Admin Panel [auto-deploy]",
            content: encodedContent,
            branch: branch,
            ...(currentSha ? { sha: currentSha } : {}),
          }),
        });

        if (!commitRes.ok) {
          const errData = await commitRes.json().catch(() => ({}));
          throw new Error(errData.message || `GitHub returned ${commitRes.status}`);
        }

        showToast("🚀 Successfully committed to GitHub! Vercel is now deploying your changes live!", "success");
      } catch (err) {
        console.error("GitHub commit error:", err);
        showToast("Deploy error: " + err.message, "error");
      } finally {
        btnGhDeploy.disabled = false;
        btnGhDeploy.innerHTML = `<i class="fas fa-rocket"></i> Commit &amp; Deploy to Vercel`;
      }
    });
  }

  // Init
  loadInitialData();
})();
