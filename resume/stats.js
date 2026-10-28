const statsContainer = document.getElementById("coding-stats");

const formatDuration = (seconds) => {
  const totalHours = Math.floor(seconds / 3600);
  if (totalHours < 1) {
    return `${Math.floor(seconds / 60)}m`;
  }
  return `${totalHours.toLocaleString()}h`;
};

const getTopItem = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }
  return [...items].sort((a, b) => b.total - a.total)[0];
};

const defaultCards = [
  { label: "Total coding time", value: "656h", detail: "tracked on Hackatime" },
  { label: "Most used language", value: "JavaScript", detail: "79h" },
  { label: "Most used editor", value: "Unity", detail: "172h" },
  { label: "Most worked-on project", value: "Cozy Farm", detail: "35h" }
];

function renderCards(cards) {
  if (!statsContainer) return;
  statsContainer.replaceChildren();

  const list = Array.isArray(cards) && cards.length > 0 ? cards : defaultCards;
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

async function loadCodingStats() {
  if (!statsContainer) return;

  let statsConfig = null;
  try {
    const localData = typeof portfolioDataSync !== "undefined" && portfolioDataSync.getData
      ? portfolioDataSync.getData()
      : null;
    if (localData && localData.resume && localData.resume.stats) {
      statsConfig = localData.resume.stats;
    } else {
      const resp = await fetch("/data/portfolio-data.json");
      if (resp.ok) {
        const json = await resp.json();
        statsConfig = json.resume?.stats;
      }
    }
  } catch (err) {
    console.debug("Could not read portfolio-data.json directly:", err);
  }

  const username = statsConfig?.username || "Samarth";
  const mode = statsConfig?.mode || "auto";
  const customCards = statsConfig?.cards && statsConfig.cards.length > 0
    ? statsConfig.cards
    : defaultCards;

  // Render configured custom cards first
  renderCards(customCards);

  // If in custom-only mode, do not override with API
  if (mode === "custom") {
    statsContainer.setAttribute("aria-busy", "false");
    return;
  }

  // Auto mode: fetch live from Hackatime to update values
  try {
    const response = await fetch(
      `https://hackatime.hackclub.com/api/summary?user_id=${encodeURIComponent(username)}&interval=all_time`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error(`Hackatime returned ${response.status}`);
    }

    const data = await response.json();
    const languages = data.languages ?? [];
    const unityLanguage = languages.find(
      (language) => language.key?.toLowerCase() === "unity"
    );
    const rankedLanguages = languages.filter(
      (language) => language !== unityLanguage
    );
    const totalSeconds = languages.reduce((sum, language) => sum + language.total, 0);

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

    renderCards(liveCards);
  } catch (e) {
    console.debug("Hackatime live fetch failed, showing saved custom stats:", e);
    // Keep custom cards cleanly rendered without showing broken error UI!
  } finally {
    statsContainer.setAttribute("aria-busy", "false");
  }
}

loadCodingStats();
