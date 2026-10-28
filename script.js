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

  // Toggle dark/light mode
  if (darkModeToggle) {
    darkModeToggle.addEventListener("click", () => {
      if (document.body.classList.contains("dark")) {
        document.body.classList.remove("dark");
        document.body.classList.add("light");
        localStorage.setItem("theme", "light");
      } else {
        document.body.classList.remove("light");
        document.body.classList.add("dark");
        localStorage.setItem("theme", "dark");
      }
      initializeParticles();
    });
  }

  // Handle section highlighting on scroll
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".scroll-indicator a");

  window.addEventListener("scroll", () => {
    let current = "";

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      if (window.scrollY >= sectionTop - 200) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href").substring(1) === current) {
        link.classList.add("active");
      }
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute("href")).scrollIntoView({
        behavior: "smooth",
      });
    });
  });

  // Cursor customization
  const cursor = document.querySelector(".cursor");
  const cursorinner = document.querySelector(".cursor2");
  const links = document.querySelectorAll("a");

  document.addEventListener("mousemove", function (e) {
    const x = e.clientX;
    const y = e.clientY;
    if (cursor) {
      cursor.style.transform = `translate3d(calc(${x}px - 50%), calc(${y}px - 50%), 0)`;
    }
    if (cursorinner) {
      cursorinner.style.left = `${x}px`;
      cursorinner.style.top = `${y}px`;
    }
  });

  document.addEventListener("mousedown", function () {
    cursor?.classList.add("click");
    cursorinner?.classList.add("cursorinnerhover");
  });

  document.addEventListener("mouseup", function () {
    cursor?.classList.remove("click");
    cursorinner?.classList.remove("cursorinnerhover");
  });

  links.forEach((link) => {
    link.addEventListener("mouseover", () => cursor?.classList.add("hover"));
    link.addEventListener("mouseleave", () =>
      cursor?.classList.remove("hover"),
    );
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
