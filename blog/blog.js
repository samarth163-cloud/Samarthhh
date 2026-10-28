// Blog Interactive Features: Theme & Mobile Navigation
// Robust, high-speed, and idempotent logic

(function() {
  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      if (document.body) {
        document.body.classList.add("dark");
        document.body.classList.remove("light");
      }
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      if (document.body) {
        document.body.classList.remove("dark");
        document.body.classList.add("light");
      }
    }
    
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch (e) {}

    const themeBtn = document.getElementById("darkmode-toggle-id");
    if (themeBtn) {
      themeBtn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
      themeBtn.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
    }
  }

  // 1. Instant execution to eliminate any flash
  const initialTheme = (function() {
    try {
      return localStorage.getItem("theme") || "light";
    } catch (e) {
      return "light";
    }
  })();
  applyTheme(initialTheme);

  // 2. Setup handlers once DOM is ready
  function initBlogInteractions() {
    // Re-verify theme in case body wasn't ready
    applyTheme(localStorage.getItem("theme") || "light");

    // Theme Toggle Handler (Single exclusive onclick)
    const themeBtn = document.getElementById("darkmode-toggle-id");
    if (themeBtn) {
      themeBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        const currentTheme = document.documentElement.getAttribute("data-theme") || 
                             (document.documentElement.classList.contains("dark") ? "dark" : "light");
        const nextTheme = currentTheme === "dark" ? "light" : "dark";
        applyTheme(nextTheme);
      };
    }

    // Mobile Menu Toggle
    const menuToggle = document.getElementById("menu-toggle-id") || document.querySelector(".menu-toggle");
    const siteMenu = document.getElementById("site-menu") || document.querySelector(".menu");

    if (menuToggle && siteMenu) {
      const toggleIcon = menuToggle.querySelector("i");

      const closeMenu = () => {
        siteMenu.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
        if (toggleIcon) {
          toggleIcon.className = "fas fa-bars";
        }
      };

      menuToggle.onclick = function(e) {
        e.stopPropagation();
        const isOpen = siteMenu.classList.toggle("is-open");
        menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        if (toggleIcon) {
          toggleIcon.className = isOpen ? "fas fa-times" : "fas fa-bars";
        }
      };

      siteMenu.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", () => {
          closeMenu();
        });
      });

      document.addEventListener("click", (e) => {
        if (siteMenu.classList.contains("is-open") && !siteMenu.contains(e.target) && !menuToggle.contains(e.target)) {
          closeMenu();
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && siteMenu.classList.contains("is-open")) {
          closeMenu();
        }
      });
    }

    // Dynamic Filter Chips (if present on blog list page)
    const chips = document.querySelectorAll(".filter-chip");
    const cards = document.querySelectorAll(".blog-card");

    if (chips.length > 0 && cards.length > 0) {
      chips.forEach((chip) => {
        chip.addEventListener("click", () => {
          chips.forEach((c) => c.classList.remove("active"));
          chip.classList.add("active");
          const filter = (chip.getAttribute("data-tag") || "all").toLowerCase();

          cards.forEach((card) => {
            if (filter === "all") {
              card.style.display = "";
            } else {
              const tags = (card.getAttribute("data-tags") || "").toLowerCase();
              card.style.display = tags.includes(filter) ? "" : "none";
            }
          });
        });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBlogInteractions);
  } else {
    initBlogInteractions();
  }
})();
