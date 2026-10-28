// Blog Interactive Features: Theme & Mobile Navigation

(function() {
  // Theme Switcher Sync
  const themeBtn = document.getElementById("darkmode-toggle-id");
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      if (document.body) document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      if (document.body) document.body.classList.remove("dark");
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

    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = siteMenu.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      if (toggleIcon) {
        toggleIcon.className = isOpen ? "fas fa-times" : "fas fa-bars";
      }
    });

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
})();
