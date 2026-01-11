let viewingSeason = null; // number
let isHistoricView = false; // boolean
let currentSeason = null;

let tbody = null;
let seasonMeta = null;

let seasonCountdownInterval = null;
let seasonCountdownShowing = false;
let seasonCountdownOriginalText = "";
let seasonCountdownEndTime = null;

const BASE_PATH = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);


function fetchNoCache(url) {
  return fetch(`${url}?v=${Date.now()}`);
}

async function getCurrentSeason() {
  const res = await fetchNoCache('data/misc_data.json');
  const miscData = await res.json();
  const seasonStart = miscData.seasons;

  const now = Date.now();

  const sorted = Object.entries(seasonStart)
    .map(([s, start]) => [Number(s), start])
    .sort((a, b) => a[1] - b[1]);

  let currentSeasonNum = sorted[0][0];
  let startTime = sorted[0][1];
  let endTime = null;

  for (let i = 0; i < sorted.length; i++) {
    const [season, start] = sorted[i];
    if (now >= start) {
      currentSeasonNum = season;
      startTime = start;
      endTime = sorted[i + 1] ? sorted[i + 1][1] : null;
    } else {
      break;
    }
  }

  const result = {
    season: currentSeasonNum,
    start: startTime,
    end: endTime
  };

  result.valueOf = () => currentSeasonNum;
  result.toString = () => String(currentSeasonNum);

  return result;
}

function getSeasonFromURL() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has("season")) return null;

  const n = Number(params.get("season"));
  return Number.isInteger(n) ? n : null;
}

function withSeason(url, season) {
  if (season === null || season === undefined) return url;
  if (season === currentSeason) return url;

  
  const u = new URL(url, window.location.href);
  u.searchParams.set("season", season);
  
  
  return u.pathname + u.search;
}


function rankPlayers(players, names) {
  // sort with tie-breaking rules
  const sorted = [...players].sort((a, b) => {
    // 1) points
    if (b.points !== a.points) return b.points - a.points;

    // 2) MMR
    if (b.mu !== a.mu) return b.mu - a.mu;

    // 3) name (stable + deterministic)
    const nameA = (names[a.id] || a.id).toLowerCase();
    const nameB = (names[b.id] || b.id).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // competition ranking (1,2,2,4)
  let currentRank = 0;
  let lastKey = null;

  sorted.forEach((p, idx) => {
    const key = `${p.points}|${p.mu}`;

    if (key !== lastKey) {
      currentRank = idx + 1;
      lastKey = key;
    }

    p.rank = currentRank;
  });

  return sorted;
}





function formatSeasonRange(start, end) {
  const startStr = formatFullDate(start);
  const endStr = end ? formatFullDate(end) : '';
  return end ? `${startStr} – ${endStr}` : startStr;
}

function updateSeasonCountdown(extraEl) {
  const now = Date.now();
  const remaining = seasonCountdownEndTime - now;

  function formatRemaining(ms) {
    if (ms <= 0) return "0s remaining";
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    if (day >= 1) return `${day} day${day > 1 ? "s" : ""} left`;
    if (hr >= 1) return `${hr} hour${hr > 1 ? "s" : ""} left`;
    if (min >= 1) return `${min} minute${min > 1 ? "s" : ""} left`;
    return `${sec} second${sec > 1 ? "s" : ""} left`;
  }

  extraEl.textContent = formatRemaining(remaining);
}




function enableSeasonCountdown(seasonLabelEl, endTime) {
  const extraEl = seasonLabelEl?.querySelector(".season-extra");
  if (!extraEl) return;

  // Always reset when called
  clearInterval(seasonCountdownInterval);
  seasonCountdownInterval = null;
  seasonCountdownShowing = false;

  if (isHistoricView || !endTime) return;

  seasonCountdownEndTime = endTime;
  seasonCountdownOriginalText = extraEl.textContent.trim();
}



/*
function maybeLink(inner, href) {
  return isHistoricView
    ? `<span class="row-static">${inner}</span>`
    : `<a href="${href}" class="row-link">${inner}</a>`;
}


*/

function maybeLink(inner, href) {
  // always return a link, regardless of historic view
  return `<a href="${href}" class="row-link${isHistoricView ? " historic-link" : ""}">${inner}</a>`;
}



function ratingToIcon(rating) {
  let bucket;
  if (rating <= 399) bucket = 0;
  else if (rating <= 849) bucket = 1;
  else if (rating <= 1999) bucket = 2;
  else if (rating <= 2999) bucket = 3;
  else if (rating <= 3999) bucket = 4;
  else if (rating <= 4999) bucket = 5;
  else if (rating <= 5999) bucket = 6;
  else if (rating <= 6999) bucket = 7;
  else if (rating <= 7999) bucket = 8;
  else if (rating <= 8999) bucket = 9;
  else if (rating <= 10499) bucket = 10;
  else if (rating <= 11999) bucket = 11;
  else if (rating <= 14499) bucket = 12;
  else bucket = 13;

  if (bucket <= 1) return "icons/d1.jpg";
  if (bucket === 2) return "icons/d2.jpg";
  if (bucket === 3) return "icons/d3.jpg";

  if (bucket >= 4 && bucket <= 6) return `icons/c${bucket - 3}.jpg`;
  if (bucket >= 7 && bucket <= 9) return `icons/b${bucket - 6}.jpg`;
  if (bucket >= 10 && bucket <= 12) return `icons/a${bucket - 9}.jpg`;

  return "icons/s.jpg";
}

formatSeasonRange

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

function formatFullDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function updateSeasonLabel(season, start, end, seasonLabelEl) {
  if (!seasonLabelEl) return;

  const coreEl = seasonLabelEl.querySelector(".season-core");
  const extraEl = seasonLabelEl.querySelector(".season-extra");

  if (coreEl) coreEl.textContent = `Season ${season}`;

  if (!extraEl) return;

  if (isHistoricView && end) {
    extraEl.textContent = `${formatFullDate(start)} – ${formatFullDate(end)}`;
    extraEl.style.cursor = "default";
  } else {
    extraEl.textContent = `${formatDate(start)}${end ? " – " + formatDate(end) : ""}`;
    extraEl.style.cursor = "";
  }
}

function timeAgo(timestamp) {
  const then = (typeof timestamp === 'number') ? new Date(timestamp) : new Date(Number(timestamp) || timestamp);
  const now = new Date();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;

  const months = Math.floor(days / 30.44);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365.25);
  return `${years}y ago`;
}

function mostPlayedRace(counts) {
  if (!Array.isArray(counts) || counts.length < 4) return "-";
  const races = ["Protoss", "Zerg", "Terran", "Random"];
  const max = Math.max(...counts);
  if (max === 0) return "-";
  const i = counts.indexOf(max);
  return races[i];
}

function buildGlobalRankMap(ratings) {
  const arr = Object.entries(ratings).map(([id, v]) => ({ id, mu: v[1] }));
  arr.sort((a, b) => b.mu - a.mu);
  const map = {};
  arr.forEach((p, idx) => map[p.id] = idx + 1);
  return map;
}

function renderLeaderboard(ratings, names) {
  const allPlayers = Object.entries(ratings).map(([id, v]) => {
    const [games, mu, sigma, wins, pCount, tCount, zCount, rCount, ts] = v;
    const rating = v[21];
    const losses = games - wins;
    return {
      id, games, mu, sigma, wins, losses,
      races: [pCount, zCount, tCount, rCount],
      ts,
      rating
    };
  });

const rankedPlayers = rankPlayers(
  allPlayers.map(p => ({
    ...p,
    points: p.rating   // adapt leaderboard "rating" to ranking "points"
  })),
  names
);

  tbody.innerHTML = "";

  rankedPlayers.forEach(p => {
    const race = mostPlayedRace(p.races);
    const playerName = names[p.id] || p.id;

    const row = document.createElement("tr");
    row.classList.toggle("clickable", !isHistoricView);

    row.innerHTML = `
      <td></td>
      <td>
        ${maybeLink(p.rank, withSeason(`player.html?id=${p.id}`, viewingSeason))}
      </td>
      <td class="player-cell">
        ${maybeLink(
          `<span class="player-name">${playerName}</span><br>
           <span class="race-subtext">${race}</span>`,
          withSeason(`player.html?id=${p.id}`, viewingSeason)
        )}
      </td>
      <td>
        ${maybeLink(
          `<span class="rating-cell">
             <img src="${ratingToIcon(p.rating)}" alt="" class="rating-icon">
             <span>${p.rating}</span>
           </span>`,
          withSeason(`player.html?id=${p.id}`, viewingSeason)
        )}
      </td>
      <td>
        ${maybeLink(`${p.mu.toFixed(0)}`, withSeason(`player.html?id=${p.id}`, viewingSeason))}
      </td>
      <td>
        ${maybeLink(`${p.wins}-${p.losses}`, withSeason(`player.html?id=${p.id}`, viewingSeason))}
      </td>
      <td>
        ${maybeLink(`${timeAgo(p.ts)}`, withSeason(`player.html?id=${p.id}`, viewingSeason))}
      </td>
      <td></td>
    `;
    tbody.appendChild(row);
  });
}


  // CLEAN UP THIS SHIT
 function setupSeasonShift(seasonLabelEl) {
  const wrap = document.querySelector(".season-wrap");
  const extra = seasonLabelEl?.querySelector(".season-extra");
  if (!wrap || !extra || !seasonLabelEl) return;

  const saved = {
    maxWidth: extra.style.maxWidth,
    opacity: extra.style.opacity,
    position: extra.style.position,
    pointerEvents: extra.style.pointerEvents,
  };

  // temporarily show green box offscreen
  extra.style.maxWidth = "none";
  extra.style.opacity = "0";
  extra.style.position = "absolute";
  extra.style.pointerEvents = "none";

  const redRect = seasonLabelEl.getBoundingClientRect();
  const greenRect = extra.getBoundingClientRect();
  const gap = parseFloat(getComputedStyle(extra).marginLeft) || 50;
  const compositeWidth = redRect.width + gap + greenRect.width;

  // restore original styles
  extra.style.maxWidth = saved.maxWidth;
  extra.style.opacity = saved.opacity;
  extra.style.position = saved.position;
  extra.style.pointerEvents = saved.pointerEvents;

  // apply horizontal shift
  const shiftX = -((greenRect.width + gap) / 2) - 6;
  wrap.style.setProperty("--shift-x", `${shiftX}px`);
}


async function loadSeason(seasonNumber, seasonLabelEl) {
  if (seasonCountdownInterval) {
  clearInterval(seasonCountdownInterval);
  seasonCountdownInterval = null;
  seasonCountdownShowing = false;
}


if (currentSeason === null) return;

  
  viewingSeason = seasonNumber;

isHistoricView = viewingSeason !== currentSeason;
document.body.classList.toggle("historic-view", isHistoricView);



history.replaceState(
  { season: viewingSeason },
  "",
  isHistoricView
    ? withSeason("index.html", viewingSeason)
    : "index.html"
);

  const start = seasonMeta.seasons[seasonNumber];
  const end = seasonMeta.seasons[seasonNumber + 1] ?? null;

  updateSeasonLabel(seasonNumber, start, end, seasonLabelEl);
  setupSeasonShift(seasonLabelEl);
  if (!isHistoricView && end) {
  enableSeasonCountdown(seasonLabelEl, end);
}



  const [ratings, names] = await Promise.all([
    fetchNoCache(`${BASE_PATH}data/seasons/${seasonNumber}/ratings.json`).then(r => r.json()),
    fetchNoCache(`${BASE_PATH}data/seasons/${seasonNumber}/names.json`).then(r => r.json())
  ]);

  renderLeaderboard(ratings, names);
}


function attachSeasonExtraHandler(seasonLabelEl) {
  const extraEl = seasonLabelEl?.querySelector(".season-extra");
  if (!extraEl) return;

  extraEl.addEventListener("click", (ev) => {
    if (isHistoricView) return;

    ev.stopPropagation();

    if (seasonCountdownShowing) {
      seasonCountdownShowing = false;
      clearInterval(seasonCountdownInterval);
      seasonCountdownInterval = null;
      extraEl.textContent = seasonCountdownOriginalText;
    } else {
      seasonCountdownShowing = true;
      updateSeasonCountdown(extraEl);
      seasonCountdownInterval = setInterval(
        () => updateSeasonCountdown(extraEl),
        1000
      );
    }
  });
}






document.addEventListener("DOMContentLoaded", async () => {
  const leaderboardTable = document.querySelector("#leaderboard");
  if (!leaderboardTable) return;
  tbody = leaderboardTable.querySelector("tbody");
  if (!tbody) return;

  ({ season: currentSeason, start: startTime, end: endTime } = await getCurrentSeason());
  seasonMeta = await fetchNoCache('data/misc_data.json').then(r => r.json());

  let allSeasons = Object.keys(seasonMeta.seasons)
    .map(Number)
    .filter(season => season >= 0 && season <= currentSeason)
    .sort((a, b) => b - a);

  const TEST_EXTRA_SEASONS = false;
  if (TEST_EXTRA_SEASONS) {
    const lowest = Math.min(...allSeasons);
    for (let i = 1; i <= 12; i++) {
      allSeasons.push(lowest - i);
      seasonMeta.seasons[lowest - i] = seasonMeta.seasons[lowest] - i * 1000 * 60 * 60 * 24 * 90;
    }
    allSeasons.sort((a, b) => b - a);
  }
  
  const seasonFromURL = getSeasonFromURL();

viewingSeason =
  seasonFromURL !== null &&
  seasonFromURL !== currentSeason &&
  seasonFromURL in seasonMeta.seasons
    ? seasonFromURL
    : currentSeason;

isHistoricView = viewingSeason !== currentSeason;
document.body.classList.toggle("historic-view", isHistoricView);



  const seasonLabelEl = document.getElementById("season-label");
  attachSeasonExtraHandler(seasonLabelEl);
  
  


function buildSeasonPanel(panelEl) {
  panelEl.innerHTML = "";

  const header = document.createElement("div");
  header.className = "season-header";
  header.textContent = "Select season";
  panelEl.appendChild(header);

  allSeasons.forEach(season => {
    if (season === viewingSeason) return;

    const start = seasonMeta.seasons[season];
    const end = seasonMeta.seasons[season + 1] ?? null;

    const row = document.createElement("div");
    row.className = "season-item";
    if (season === currentSeason) row.classList.add("current-season");

    row.innerHTML = `
      <span class="season-number">Season ${season}</span>

      <span class="season-dates-grid">
        <span class="season-date from">${formatFullDate(start)}</span>
        <span class="season-date dash">–</span>
        <span class="season-date to">${end ? formatFullDate(end) : ""}</span>
      </span>
    `;

    row.addEventListener("click", async (e) => {
      e.stopPropagation();
      panelEl.hidden = true;
      await loadSeason(season, seasonLabelEl);
    });

    panelEl.appendChild(row);
  });
}

const archiveBtn = document.getElementById("archive-season-toggle");
const archivePanel = document.getElementById("archive-season-panel");

archiveBtn?.addEventListener("click", (e) => {
  e.stopPropagation();

  

  buildSeasonPanel(archivePanel);
  archivePanel.hidden = !archivePanel.hidden;
});

document.addEventListener("click", () => {
  archivePanel.hidden = true;
});





  

  







  // ------------------------
  // CLEAN UP THIS SHIT
  // ------------------------
  if (seasonLabelEl) {
    updateSeasonLabel(currentSeason, startTime, endTime, seasonLabelEl);
    setupSeasonShift(seasonLabelEl); 

    // Season countdown logic



  }

  // ------------------------
  // Last updated info
  // ------------------------
const lastUpdatedEl = document.getElementById("last-updated");
  if (lastUpdatedEl) {
    try {
      const procData = await fetchNoCache("data/misc_data.json").then(r => r.json());
      const lastProcess = procData.last_process;
      const tsMs = lastProcess < 1e12 ? lastProcess * 1000 : lastProcess;
      const relTime = timeAgo(tsMs);
      
      
      lastUpdatedEl.innerHTML = `Match data from <a href="https://shieldbattery.net" target="_blank" rel="noopener noreferrer" style="color:#89CFF0;">ShieldBattery.net</a>. <span class="last-process-time">Last updated ${relTime}.</span>`;
    } catch (err) {
      console.error("Failed to load proc_data.json:", err);
      lastUpdatedEl.innerHTML = `Match data from <a href="https://shieldbattery.net" target="_blank" rel="noopener noreferrer" style="color:#89CFF0;">ShieldBattery.net</a>.`;
    }
  }

  await loadSeason(viewingSeason ?? currentSeason, seasonLabelEl); 
});