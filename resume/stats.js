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

const addStat = (label, value, detail) => {
  const card = document.createElement("article");
  card.className = "stat-card";

  const statLabel = document.createElement("p");
  statLabel.className = "stat-label";
  statLabel.textContent = label;

  const statValue = document.createElement("strong");
  statValue.className = "stat-value";
  statValue.textContent = value;

  const statDetail = document.createElement("span");
  statDetail.className = "stat-detail";
  statDetail.textContent = detail;

  card.append(statLabel, statValue, statDetail);
  statsContainer.append(card);
};

async function loadCodingStats() {
  try {
    const response = await fetch(
      "https://hackatime.hackclub.com/api/summary?user_id=Samarth&interval=all_time",
      { cache: "no-store" },
    );

    if (!response.ok) {
      throw new Error(`Hackatime returned ${response.status}`);
    }

    const data = await response.json();

    const languages = data.languages ?? [];
    const unityLanguage = languages.find(
      (language) => language.key?.toLowerCase() === "unity",
    );
    const rankedLanguages = languages.filter(
      (language) => language !== unityLanguage,
    );
    const totalSeconds = languages.reduce((sum, language) => {
      return sum + language.total;
    }, 0);

    const topLanguage = getTopItem(rankedLanguages);
    const topEditor = unityLanguage
      ? { ...unityLanguage, key: "Unity" }
      : getTopItem(data.editors);
    const topProject = getTopItem(data.projects);

    statsContainer.replaceChildren();

    addStat(
      "Total coding time",
      formatDuration(totalSeconds),
      "tracked on Hackatime",
    );

    if (topLanguage) {
      addStat(
        "Most used language",
        topLanguage.key,
        formatDuration(topLanguage.total),
      );
    }

    if (topEditor) {
      addStat(
        "Most used editor",
        topEditor.key,
        formatDuration(topEditor.total),
      );
    }

    if (topProject) {
      addStat(
        "Most worked-on project",
        topProject.key,
        formatDuration(topProject.total),
      );
    }
  } catch {
    statsContainer.innerHTML =
      '<p class="stats-error">Coding stats are unavailable right now.</p>';
  } finally {
    statsContainer.setAttribute("aria-busy", "false");
  }
}

loadCodingStats();
