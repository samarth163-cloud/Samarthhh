document.addEventListener("DOMContentLoaded", () => {
  const darkModeToggle = document.getElementById("darkmode-toggle");

  const loadTotalCodingTime = async () => {
    const codingTimeElement = document.getElementById("total-coding-time");

    if (!codingTimeElement) {
      return;
    }

    try {
      const response = await fetch(
        "https://hackatime.hackclub.com/api/summary?user_id=Samarth&interval=all_time",
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(`Hackatime returned ${response.status}`);
      }

      const data = await response.json();
      const totalSeconds = (data.languages ?? []).reduce(
        (sum, language) => sum + language.total,
        0,
      );
      const totalHours = Math.floor(totalSeconds / 3600);

      codingTimeElement.innerHTML = `<strong>${totalHours.toLocaleString()}h</strong> coded in total`;
    } catch {
      codingTimeElement.hidden = true;
    }
  };

  const initializeParticles = () => {
    const isDarkMode = document.body.classList.contains("dark");
    const particleColor = isDarkMode ? "#ff3834" : "#e52521";
    const lineColor = isDarkMode ? "#ffffff" : "#111111";

    if (typeof particlesJS !== "undefined" && document.getElementById("particles-js")) {
      particlesJS("particles-js", {
        particles: {
          color: { value: particleColor },
          number: { value: 65 },
          size: { value: 3.5 },
          move: { speed: 1 },
          line_linked: {
            color: lineColor,
            opacity: isDarkMode ? 0.22 : 0.15,
            width: 1.2,
          },
        },
        interactivity: {
          events: {
            onhover: { enable: true, mode: "grab" },
            onclick: { enable: true, mode: "push" },
          },
          modes: {
            repulse: { distance: 50 },
          },
        },
      });
    }
  };

  // Initialize particles on page load
  initializeParticles();
  loadTotalCodingTime();

  // Profile pic click to cycle avatar & doodle interaction
  // Profile pic click / tap to cycle avatar & doodle interaction (Real-time 0ms response)
  const profilePic = document.getElementById("profile-pic");
  const avatarDoodle = document.getElementById("avatar-click-doodle");

  // Read initial avatars from localStorage synchronously or use clean default
  let initialAvatars = ["https://npzqpcagdtnfuqhyngro.supabase.co/storage/v1/object/public/portfolio-assets/assets/profile/1.jpg", "https://npzqpcagdtnfuqhyngro.supabase.co/storage/v1/object/public/portfolio-assets/assets/profile/3.jpg"];
  try {
    const raw = localStorage.getItem("samarth_portfolio_data") || localStorage.getItem("samarth_portfolio_data_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.general && Array.isArray(parsed.general.avatars) && parsed.general.avatars.length > 0) {
        initialAvatars = parsed.general.avatars;
      }
    }
  } catch (e) {}

  if (!window.__portfolioAvatars) {
    window.__portfolioAvatars = initialAvatars;
    window.__currentAvatarIdx = 0;
  }

  // Preload all avatar images immediately for zero-lag real-time cycling
  function preloadAvatars(list) {
    if (!Array.isArray(list)) return;
    list.forEach((src) => {
      const clean = src.startsWith("data:") || src.startsWith("http") ? src : (src.startsWith("/") ? src : `/${src}`);
      const img = new Image();
      img.src = clean;
    });
  }
  preloadAvatars(window.__portfolioAvatars);

  let lastCycleTime = 0;
  function handleAvatarCycle(e) {
    if (e) {
      if (e.cancelable && e.type !== "click") e.preventDefault();
      e.stopPropagation();
    }
    const now = Date.now();
    if (now - lastCycleTime < 180) return; // Prevent double trigger from touch+click
    lastCycleTime = now;

    const avatars = (Array.isArray(window.__portfolioAvatars) && window.__portfolioAvatars.length > 0)
      ? window.__portfolioAvatars
      : initialAvatars;

    let idx = typeof window.__currentAvatarIdx === "number" ? window.__currentAvatarIdx : 0;
    idx = (idx + 1) % avatars.length;
    window.__currentAvatarIdx = idx;

    const newSrc = avatars[idx];
    const formatted = newSrc.startsWith("data:") || newSrc.startsWith("blob:") || newSrc.startsWith("http")
      ? newSrc
      : (newSrc.startsWith("/") ? newSrc : `/${newSrc}`);

    if (profilePic) {
      profilePic.src = formatted;
      profilePic.style.transform = "scale(0.94)";
      setTimeout(() => {
        profilePic.style.transform = "";
      }, 120);
    }

    if (avatarDoodle) {
      avatarDoodle.style.transform = "rotate(-24deg) scale(1.2)";
      setTimeout(() => {
        avatarDoodle.style.transform = "";
      }, 220);
    }
  }

  if (profilePic) {
    profilePic.title = "Click to cycle avatar";
    profilePic.addEventListener("pointerup", handleAvatarCycle);
    profilePic.addEventListener("click", handleAvatarCycle);
  }

  if (avatarDoodle) {
    avatarDoodle.addEventListener("pointerup", handleAvatarCycle);
    avatarDoodle.addEventListener("click", handleAvatarCycle);
    avatarDoodle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleAvatarCycle();
      }
    });
  }

  // Unified Robust Theme Switcher Engine
  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);

    if (document.body) {
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("light", !isDark);
    }

    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch (e) {}

    if (darkModeToggle) {
      darkModeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
      darkModeToggle.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");
    }

    initializeParticles();
  }

  // Ensure button title & aria-label are set on initial load
  const initialSavedTheme = (function() {
    try {
      return localStorage.getItem("theme") || "light";
    } catch (e) {
      return "light";
    }
  })();
  applyTheme(initialSavedTheme);

  // Toggle dark/light mode click handler
  if (darkModeToggle) {
    darkModeToggle.addEventListener("click", () => {
      const isCurrentlyDark = document.body.classList.contains("dark") ||
                              document.documentElement.getAttribute("data-theme") === "dark" ||
                              document.documentElement.classList.contains("dark");
      applyTheme(isCurrentlyDark ? "light" : "dark");
    });
  }

  // Cross-tab real-time theme synchronization
  window.addEventListener("storage", (e) => {
    if (e.key === "theme" && (e.newValue === "light" || e.newValue === "dark")) {
      applyTheme(e.newValue);
    }
  });

  // Handle section highlighting on scroll
  const navTargets = [
    { id: "about-me", el: document.getElementById("about-me") },
    { id: "portfolio", el: document.getElementById("portfolio") || document.getElementById("showcase") },
    { id: "blog", el: document.getElementById("blog") }
  ];
  const navLinks = document.querySelectorAll(".scroll-indicator a");

  function getElementDocTop(el) {
    if (!el) return Infinity;
    const rect = el.getBoundingClientRect();
    return rect.top + window.scrollY;
  }

  function updateScrollIndicator() {
    const scrollPos = window.scrollY + 250;
    let currentId = ""; // Header / Top has no active highlight

    navTargets.forEach((target) => {
      if (!target.el) {
        target.el = document.getElementById(target.id);
      }
      if (target.el) {
        const top = getElementDocTop(target.el);
        if (scrollPos >= top) {
          currentId = target.id;
        }
      }
    });

    if ((window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 60)) {
      currentId = "blog";
    }

    navLinks.forEach((link) => {
      const targetHref = link.getAttribute("href")?.substring(1);
      const isMatch = Boolean(targetHref && currentId && targetHref === currentId);
      link.classList.toggle("active", isMatch);
    });
  }

  window.addEventListener("scroll", updateScrollIndicator, { passive: true });
  window.addEventListener("resize", updateScrollIndicator, { passive: true });
  setTimeout(updateScrollIndicator, 300);

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // Cursor customization - 100% Synchronized concentric tracking
  const cursor = document.querySelector(".cursor");
  const cursorinner = document.querySelector(".cursor2");
  const interactiveLinks = document.querySelectorAll("a, button, input, .card, .project-card, .btn");

  let mouseX = -100, mouseY = -100;
  let ringX = -100, ringY = -100;
  let isRingMoving = false;

  function moveRing() {
    if (!cursor) return;
    ringX += (mouseX - ringX) * 0.35;
    ringY += (mouseY - ringY) * 0.35;

    cursor.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;

    if (Math.abs(mouseX - ringX) > 0.1 || Math.abs(mouseY - ringY) > 0.1) {
      requestAnimationFrame(moveRing);
    } else {
      cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      isRingMoving = false;
    }
  }

  document.addEventListener("mousemove", function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;

    document.body.classList.add("cursor-visible");

    if (cursorinner) {
      cursorinner.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    }

    if (!isRingMoving) {
      isRingMoving = true;
      requestAnimationFrame(moveRing);
    }
  });

  document.addEventListener("mouseleave", () => {
    document.body.classList.remove("cursor-visible");
  });

  document.addEventListener("mouseenter", () => {
    document.body.classList.add("cursor-visible");
  });

  document.addEventListener("mousedown", function () {
    cursor?.classList.add("click");
    cursorinner?.classList.add("cursorinnerhover");
  });

  document.addEventListener("mouseup", function () {
    cursor?.classList.remove("click");
    cursorinner?.classList.remove("cursorinnerhover");
  });

  interactiveLinks.forEach((link) => {
    link.addEventListener("mouseenter", () => cursor?.classList.add("hover"));
    link.addEventListener("mouseleave", () => cursor?.classList.remove("hover"));
  });

  const menuToggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".menu");

  if (menuToggle && menu) {
    const toggleIcon = menuToggle.querySelector("i");

    const closeMenu = () => {
      menu.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      if (toggleIcon) {
        toggleIcon.className = "fas fa-bars";
      }
    };

    menuToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = menu.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", isOpen);
      if (toggleIcon) {
        toggleIcon.className = isOpen ? "fas fa-times" : "fas fa-bars";
      }
    });

    document.querySelectorAll(".menu a").forEach((link) => {
      link.addEventListener("click", () => {
        closeMenu();
      });
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      if (menu.classList.contains("is-open") && !menu.contains(e.target) && !menuToggle.contains(e.target)) {
        closeMenu();
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        closeMenu();
      }
    });
  }
});
