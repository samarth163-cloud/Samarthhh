/**
 * Samarth's Resume - Coding Activity Stats Engine
 * Instant 0ms cache-first rendering, in-place DOM updates (no glitch/flicker),
 * Hackatime live stats with sessionStorage caching.
 */

(function () {
  const statsContainer = document.getElementById("coding-stats");
  const CACHE_KEY = "samarth_hackatime_cache";
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

  const defaultCards = [
    { label: "Total coding time", value: "656h", detail: "tracked on Hackatime" },
    { label: "Most used language", value: "JavaScript", detail: "79h" },
    { label: "Most used editor", value: "Unity", detail: "172h" },
    { label: "Most worked-on project", value: "Cozy Farm", detail: "35h" }
  ];

  const formatDuration = (seconds) => {
    const totalHours = Math.floor(seconds / 3600);
    if (totalHours < 1) {
      return `${Math.floor(seconds / 60)}m`;
    }
    return `${totalHours.toLocaleString()}h`;
  };

  const getTopItem = (items) => {
    if (!Array.isArray(items) || items.length === 0) return null;
    return [...items].sort((a, b) => (b.total || 0) - (a.total || 0))[0];
  };

  // In-place smooth DOM updater - PREVENTS ANY FLICKER OR LAYOUT SHIFTS
  function updateOrRenderCards(cards) {
    if (!statsContainer) return;
    const list = Array.isArray(cards) && cards.length > 0 ? cards : defaultCards;
    const existingCards = statsContainer.querySelectorAll(".stat-card");

    if (existingCards.length === list.length && existingCards.length > 0) {
      list.forEach((item, idx) => {
        const card = existingCards[idx];
        const lbl = card.querySelector(".stat-label");
        const val = card.querySelector(".stat-value");
        const det = card.querySelector(".stat-detail");
        if (lbl && lbl.textContent !== (item.label || "")) lbl.textContent = item.label || "";
        if (val && val.textContent !== (item.value || "--")) val.textContent = item.value || "--";
        if (det && det.textContent !== (item.detail || "")) det.textContent = item.detail || "";
      });
      return;
    }

    // Full render only when structure doesn't match
    statsContainer.replaceChildren();
    list.forEach((item) => {
      const card = document.createElement("article");
      card.className = "stat-card";

      const statLabel = document.createElement("p");
      statLabel.className = "stat-label";
      statLabel.textContent = item.label || "";

      const statValue = document.createElement("strong");
      statValue.className = "stat-value";
      statValue.textContent = item.value || "--";

      const statDetail = document.createElement("span");
      statDetail.className = "stat-detail";
      statDetail.textContent = item.detail || "";

      card.append(statLabel, statValue, statDetail);
      statsContainer.append(card);
    });
  }

  function getStatsConfig() {
    try {
      if (window.__portfolioData?.resume?.stats) {
        return window.__portfolioData.resume.stats;
      }
      const raw = localStorage.getItem("samarth_portfolio_data");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.resume?.stats) return parsed.resume.stats;
      }
    } catch (e) {}
    return null;
  }

  function getCachedHackatime(username) {
    try {
      const raw = sessionStorage.getItem(`${CACHE_KEY}_${username}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          return parsed.data;
        }
      }
    } catch (e) {}
    return null;
  }

  function setCachedHackatime(username, data) {
    try {
      sessionStorage.setItem(`${CACHE_KEY}_${username}`, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
    } catch (e) {}
  }

  async function loadCodingStats(providedConfig) {
    if (!statsContainer) return;

    const statsConfig = providedConfig || getStatsConfig();
    const username = statsConfig?.username || "Samarth";
    const mode = statsConfig?.mode || "auto";
    const customCards = Array.isArray(statsConfig?.cards) && statsConfig.cards.length > 0
      ? statsConfig.cards
      : defaultCards;

    // 1. Instant smooth render of custom/configured cards (0ms)
    updateOrRenderCards(customCards);

    // If custom-only mode, stop here
    if (mode === "custom") {
      statsContainer.setAttribute("aria-busy", "false");
      return;
    }

    // 2. Check 0ms SessionStorage Cache
    const cachedLive = getCachedHackatime(username);
    if (cachedLive) {
      updateOrRenderCards(cachedLive);
      statsContainer.setAttribute("aria-busy", "false");
      return;
    }

    // 3. Background asynchronous fetch from Hackatime (non-blocking)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // Max 3.5s timeout

      const response = await fetch(
        `https://hackatime.hackclub.com/api/summary?user_id=${encodeURIComponent(username)}&interval=all_time`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Status ${response.status}`);

      const data = await response.json();
      const languages = data.languages ?? [];
      const unityLanguage = languages.find(
        (language) => language.key?.toLowerCase() === "unity"
      );
      const rankedLanguages = languages.filter(
        (language) => language !== unityLanguage
      );
      const totalSeconds = languages.reduce((sum, language) => sum + (language.total || 0), 0);

      const topLanguage = getTopItem(rankedLanguages);
      const topEditor = unityLanguage
        ? { ...unityLanguage, key: "Unity" }
        : getTopItem(data.editors);
      const topProject = getTopItem(data.projects);

      const liveCards = [
        {
          label: customCards[0]?.label || "Total coding time",
          value: formatDuration(totalSeconds),
          detail: customCards[0]?.detail || "tracked on Hackatime"
        },
        {
          label: customCards[1]?.label || "Most used language",
          value: topLanguage ? topLanguage.key : (customCards[1]?.value || "JavaScript"),
          detail: topLanguage ? formatDuration(topLanguage.total) : (customCards[1]?.detail || "")
        },
        {
          label: customCards[2]?.label || "Most used editor",
          value: topEditor ? topEditor.key : (customCards[2]?.value || "Unity"),
          detail: topEditor ? formatDuration(topEditor.total) : (customCards[2]?.detail || "")
        },
        {
          label: customCards[3]?.label || "Most worked-on project",
          value: topProject ? topProject.key : (customCards[3]?.value || "Cozy Farm"),
          detail: topProject ? formatDuration(topProject.total) : (customCards[3]?.detail || "")
        }
      ];

      setCachedHackatime(username, liveCards);
      updateOrRenderCards(liveCards);
    } catch (e) {
      // Keep custom cards cleanly visible with zero glitch
      console.debug("Hackatime background sync note:", e.message);
    } finally {
      if (statsContainer) statsContainer.setAttribute("aria-busy", "false");
    }
  }

  // Expose global updater so data-sync doesn't wipe the DOM
  window.__renderResumeCodingStats = loadCodingStats;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => loadCodingStats());
  } else {
    loadCodingStats();
  }
})();
