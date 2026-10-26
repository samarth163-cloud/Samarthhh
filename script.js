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

  // Profile pic click to cycle avatar
  const profilePic = document.getElementById("profile-pic");
  if (profilePic) {
    let currentPicIndex = 2;
    profilePic.title = "Click to cycle avatar";
    profilePic.addEventListener("click", () => {
      currentPicIndex = (currentPicIndex % 11) + 1;
      profilePic.src = `assets/profile/${currentPicIndex}.jpg`;
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

  menuToggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", isOpen);
  });

  document.querySelectorAll(".menu a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
});
