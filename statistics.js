let activityChartInstance = null;
let activityWeekdayChartInstance = null;
let activityClockChartInstance = null;
let irsChartInstance = null;
let teamFreqChartInstance = null;
let matchupChartInstance = null;
let winrateChartInstance = null;



async function refreshStatistics() {
  activityChartInstance?.destroy();
  activityWeekdayChartInstance?.destroy();
  activityClockChartInstance?.destroy();
  irsChartInstance?.destroy();
  teamFreqChartInstance?.destroy();
  matchupChartInstance?.destroy();
  winrateChartInstance?.destroy();

  
  activityChartInstance = null;
  activityWeekdayChartInstance = null;
  activityClockChartInstance = null;
  irsChartInstance = null;
  teamFreqChartInstance = null;
  matchupChartInstance = null;
  winrateChartInstance = null;

  await loadAllStatisticsCharts();
}



const CHART_COLORS = {
  ACTIVITY_BAR: "rgba(255,111,60,0.7)",
  ACTIVITY_BORDER: "#FF6F3C",
  FREQUENCY_BAR: "rgba(79,163,255,0.8)",
  FREQUENCY_BORDER: "#4FA3FF",
  WINRATE_BAR: "rgba(57,208,112,0.8)",
  WINRATE_BORDER: "#39D070",
};

const CHART_COLORSX = {
  ACTIVITY_BAR: "rgba(180, 80, 45, 0.7)",
  ACTIVITY_BORDER: "#B4502D",
  FREQUENCY_BAR: "rgba(60, 110, 160, 0.8)",
  FREQUENCY_BORDER: "#3C6E9F",
  WINRATE_BAR: "rgba(65, 120, 80, 0.8)",
  WINRATE_BORDER: "#417850",
};

async function discoverSeasons() {
  const seasons = [];
  let i = 0;

  while (true) {
    try {
      const res = await fetch(`data/seasons/${i}/statistics_data.json`);
      
      // If the file doesn't exist, we've reached the end of the seasons
      if (!res.ok) break;

      seasons.push(i);
      i++;
    } catch (err) {
      // Break on network errors or total loss of connection
      break; 
    }
  }

  return seasons;
}

const statsToggle = document.getElementById("stats-select-toggle");
const statsPanel = document.getElementById("stats-select-panel");
let currentStatsScope = "all";

statsToggle.addEventListener("click", async (e) => {
  e.stopPropagation();
  if (statsPanel.innerHTML.trim() === "") {
    await populateStatsMenu();
  }
  if (statsPanel.hidden) {
    statsPanel.hidden = false;
    statsPanel.style.display = "block";
  } else {
    statsPanel.hidden = true;
    statsPanel.style.display = "none";
  }
});

async function populateStatsMenu() {
  const seasons = await discoverSeasons();
  statsPanel.innerHTML = `
    <div class="season-header">Include data from:</div>
    <div class="season-item ${currentStatsScope === "all" ? "current-season" : ""}"
         data-scope="all">
      <span>All seasons</span>
    </div>
  `;
  seasons.forEach(season => {
    const item = document.createElement("div");
    item.className = "season-item";
    if (currentStatsScope === season) {
      item.classList.add("current-season");
    }
    item.dataset.scope = season;
    item.innerHTML = `<span>Season ${season}</span>`;
    statsPanel.appendChild(item);
  });
  statsPanel.querySelectorAll(".season-item").forEach(item => {
    item.addEventListener("click", async (e) => {
      e.stopPropagation();
      currentStatsScope = item.dataset.scope === "all"
        ? "all"
        : Number(item.dataset.scope);
      statsPanel.hidden = true;
      statsPanel.style.display = "none";
      statsPanel.innerHTML = "";
      await refreshStatistics();
    });
  });
}

async function getActivityTimestampsForScope(scope) {
  if (scope === "all") {
    const seasons = await discoverSeasons();
    const allTimestamps = [];
    for (const season of seasons) {
      try {
        const res = await fetchNoCache(`data/seasons/${season}/statistics_data.json`);
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data.activity)) {
          allTimestamps.push(...data.activity);
        }
      } catch (err) {}
    }
    return allTimestamps;
  }
  const res = await fetchNoCache(`data/seasons/${scope}/statistics_data.json`);
  const data = await res.json();
  return data.activity || [];
}








/* CHART 5 Seasonal Activity id = activityChart */


async function loadActivityChart() {
  
  function weekStartUTC(date) {
  const d = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  const wd = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - wd + 1);
  return d;
}

function currentWeekStartUTC() {
  return weekStartUTC(new Date());
}

  let _seasonStartsCache = null;

async function getSeasonStartsUTC() {
  if (_seasonStartsCache) return _seasonStartsCache;

  const res = await fetchNoCache("data/misc_data.json");
  const data = await res.json();

  _seasonStartsCache = Object.fromEntries(
    Object.entries(data.seasons).map(([k, v]) => [
      Number(k),
      new Date(v)
    ])
  );

  return _seasonStartsCache;
}

async function resolveActivityAxisBounds(scope) {
  const seasonStarts = await getSeasonStartsUTC();

  // ignore season -1 etc
  const realSeasons = Object.keys(seasonStarts)
    .map(Number)
    .filter(s => s >= 0);

  // what's the current season
  const now = new Date();

const nowSeason = realSeasons
  .filter(s => seasonStarts[s] <= now)
  .sort((a, b) => b - a)[0];

  // ALL seasons
  if (scope === "all") {
    const earliestSeason = Math.min(...realSeasons);
    return {
      startUTC: weekStartUTC(seasonStarts[earliestSeason]),
      endUTC: currentWeekStartUTC()
    };
  }

  // SINGLE season: negative scope (-1, etc.) fallback
  if (scope < 0) {
    const earliestSeason = Math.min(...realSeasons);
    return {
      startUTC: weekStartUTC(seasonStarts[earliestSeason]),
      endUTC: currentWeekStartUTC()
    };
  }

  // SINGLE season: normal positive season
  const season = scope;
  const seasonStart = seasonStarts[season];
  const nextSeasonStart = seasonStarts[season + 1];

  const startUTC = weekStartUTC(seasonStart);

  
  const endUTC = (season === nowSeason)
    ? currentWeekStartUTC() // current season → end at current week
    : (nextSeasonStart ? weekStartUTC(nextSeasonStart) : currentWeekStartUTC()); // finished season → end at next season start

  return { startUTC, endUTC };
}






  const timestamps = await getActivityTimestampsForScope(currentStatsScope);
  if (!timestamps.length) return;

  const datesUTC = timestamps
    .map(ts => new Date(ts))
    .sort((a, b) => a - b);



  const { startUTC, endUTC } =
  await resolveActivityAxisBounds(currentStatsScope);


  const weekBuckets = {};

  for (
  let d = new Date(startUTC);
  d <= endUTC;
  d.setUTCDate(d.getUTCDate() + 7)
) {
    weekBuckets[d.toISOString().slice(0, 10)] = 0;
  }

  for (const date of datesUTC) {
    const w = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    ));
    const wd = w.getUTCDay() === 0 ? 7 : w.getUTCDay();
    w.setUTCDate(w.getUTCDate() - wd + 1);

    const key = w.toISOString().slice(0, 10);
    if (key in weekBuckets) weekBuckets[key]++;
  }

  const labels = Object.keys(weekBuckets);
  const counts = Object.values(weekBuckets);


  activityChartInstance = new Chart(
  document.getElementById("activityChart"),
  {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: CHART_COLORS.ACTIVITY_BAR,
        borderColor: CHART_COLORS.ACTIVITY_BORDER,
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function () {
              return ""; // remove default header
            },
            label: function (context) {
              return context.raw + " games";
            }
          }
        }
      },
      scales: {
        x: {
  title: {
    display: true,
    text: "Week starting",
    color: "#ccc"
  },
  ticks: {
    color: "#ccc"
  },
  grid: { color: "#222" }
},
y: {
  beginAtZero: true,
  ticks: { color: "#ccc" },
  grid: { color: "#222" }
}
      }
    }
  }
);
}





/* CHART 6 Weekday Activity */



async function loadActivityWeekdayChart() {
  const timestamps = await getActivityTimestampsForScope(currentStatsScope);
  if (!timestamps.length) return;

  const datesUTC = timestamps
    .map(ts => new Date(ts))
    .sort((a, b) => a - b);

  // Weekday buckets: Mon = 0 … Sun = 6
  const weekdayBuckets = Array(7).fill(0);
  for (const d of datesUTC) {
    const jsDay = d.getUTCDay();     // 0=Sun … 6=Sat
    const idx = (jsDay + 6) % 7;     // shift → 0=Mon … 6=Sun
    weekdayBuckets[idx]++;
  }

  // Weeks spanned
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSpan = Math.max(
    1,
    (datesUTC.at(-1) - datesUTC[0]) / msPerWeek
  );

  const weekdayAverages = weekdayBuckets.map(v => v / weeksSpan);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Destroy old instance if needed
  if (activityWeekdayChartInstance) {
    activityWeekdayChartInstance.destroy();
  }

  activityWeekdayChartInstance = new Chart(
    document.getElementById("activityWeekdayChart"),
    {
      type: "bar",
      data: {
        labels,
        datasets: [{
          data: weekdayAverages,
          backgroundColor: CHART_COLORS.ACTIVITY_BAR,
          borderColor: CHART_COLORS.ACTIVITY_BORDER,
          borderWidth: 2
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            callbacks: {
              label: (ctx) => {
                const i = ctx.dataIndex;
                const avg = weekdayAverages[i].toFixed(2);
                const total = weekdayBuckets[i];

                return [
                  `Avg games per week: ${avg}`,
                  `Total games: ${total}`
                ];
              }
            }
          }
        },
        scales: {
          x: { grid: { color: "#222" } },
          y: {
            beginAtZero: true,
            grid: { color: "#222" },
            ticks: { precision: 2 }
          }
        }
      }
    }
  );
}


















/* Chart 7 Hourly Activity     */


async function loadActivityClockChart() {
  const timestamps = await getActivityTimestampsForScope(currentStatsScope);
  if (!timestamps.length) return;

  const hourBuckets = Array(24).fill(0);
  for (const ts of timestamps) {
    hourBuckets[new Date(ts).getUTCHours()]++;
  }

  const total = hourBuckets.reduce((a, b) => a + b, 0);
  const labels = [...Array(24).keys()].map(String);

  if (activityClockChartInstance) {
    activityClockChartInstance.destroy();
  }

  activityClockChartInstance = new Chart(
    document.getElementById("activityChartB"),
    {
      type: "radar",
      data: {
        labels: labels,
        datasets: [
          {
            data: hourBuckets,
            borderWidth: 2,
            borderColor: CHART_COLORS.ACTIVITY_BORDER,
            backgroundColor: CHART_COLORS.ACTIVITY_BAR
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              title: () => "",
              label: ctx => {
                const h = Number(ctx.label);
                const start = h.toString().padStart(2, "0") + "00";
                const end = ((h + 1) % 24).toString().padStart(2, "0") + "00";
                const pct = total
                  ? ((ctx.raw / total) * 100).toFixed(1)
                  : 0;
                return `${start}–${end} UTC: ${ctx.raw} games (${pct}%)`;
              }
            }
          }
        },
        interaction: {
          mode: "nearest",
          intersect: false
        },
        scales: {
          r: {
            angleLines: {
              color: "#333"
            },
            grid: {
              color: "#222"
            },
            ticks: {
              display: false,
              backdropColor: "transparent"
            }
          }
        }
      }
    }
  );
}

















/* CHART 4  */


async function loadIndividualRaceSelectionChart() {

  const seasons = currentStatsScope === "all"
    ? await discoverSeasons()
    : [currentStatsScope];

  
  // Merging data
  

  const irs = { p: [0,0], t: [0,0], z: [0,0], r: [0,0] }; 
irs.x = {}; 

for (const season of seasons) {
  try {
    const res = await fetchNoCache(`data/seasons/${season}/statistics_data.json`);
    if (!res.ok) continue;
    const data = await res.json();
    const sIrs = data.irs || {};

    // Merge top-level races
    for (const r of ["p","t","z","r"]) {
      if (sIrs[r]) {
        irs[r][0] += sIrs[r][0];
        irs[r][1] += sIrs[r][1];
      }
    }

    // Merge subraces if present
    if (sIrs.x) {
      for (const [sub, [w,g]] of Object.entries(sIrs.x)) {
        irs.x[sub] ??= [0,0];
        irs.x[sub][0] += w;
        irs.x[sub][1] += g;
      }
    }

  } catch(e) {
    console.warn(`Skipping season ${season} due to error:`, e);
  }
}

  
  
  
  const raceOrder  = ["p", "t", "z", "r"];
  const raceNames  = { p: "Protoss", t: "Terran", z: "Zerg", r: "Random" };
  const raceColors = { p: "#EBD678", t: "#53B3FC", z: "#C1A3F5", r: "#AABBCB" };

  const labels = raceOrder.map(r => raceNames[r]);
  const values = raceOrder.map(r => irs[r]?.[0] || 0);
  const colors = raceOrder.map(r => raceColors[r]);

  
  
  
  let tooltipEl = document.getElementById("irs-tooltip");
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "irs-tooltip";
    Object.assign(tooltipEl.style, {
      position: "absolute",
      background: "rgba(0,0,0,0.85)",
      border: "1px solid #333",
      borderRadius: "6px",
      color: "#ddd",
      padding: "8px 12px",
      fontSize: "0.85em",
      pointerEvents: "none",
      zIndex: 10,
      opacity: 0
    });
    document.body.appendChild(tooltipEl);
  }


  
  // Create 
  
  irsChartInstance = new Chart(
    document.getElementById("irsChart"),
    {
      type: "pie",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        aspectRatio: 1.3,
        plugins: {
          legend: {
            position: "right",
            labels: { color: "#ccc", boxWidth: 16, padding: 14 }
          },
          tooltip: {
            enabled: false,
            external: ctx => {
          const tooltip = ctx.tooltip;
          if (!tooltip || !tooltip.opacity) {
            tooltipEl.style.opacity = 0;
            return;
          }

          const i = tooltip.dataPoints?.[0]?.dataIndex;
          if (i == null) return;

          const key = raceOrder[i];
          const value = irs[key]?.[0] || 0;         // wins
          const totalCount = ctx.chart._metasets[0].total;  // total picks
          const percent = totalCount ? ((value / totalCount) * 100).toFixed(1) : 0;


const totalGamesAllRaces = raceOrder.reduce((sum, r) => sum + (irs[r]?.[1] || 0), 0);

const totalGamesPlayed = irs[key]?.[1] || 0; // games for this race
const [wins, games] = irs[key] || [0, 0];
const wr = games ? ((wins / games) * 100).toFixed(1) : 0;


let html = `
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
    <span style="width:12px;height:12px;background:${raceColors[key]};display:inline-block;border-radius:2px;"></span>
    <strong style="color:#fff;font-size:1em;">${raceNames[key]}</strong>
  </div>
`;

// Second line: selections for this race / total selections + %
const selectionPct = totalGamesAllRaces
  ? ((totalGamesPlayed / totalGamesAllRaces) * 100).toFixed(1)
  : "0";

html += `
  <div style="margin-bottom:6px;font-size:0.9em;padding-left:18px;">
    Selected ${totalGamesPlayed} times / ${totalGamesAllRaces} total race selections (${selectionPct}%)
  </div>
`;


html += `
  <div style="margin-bottom:6px;font-size:0.9em;padding-left:18px;">
    ${wins} wins / ${games} selections (${wr}%)
  </div>
`;


if (key === "r" && irs.x) {

  html += `
    <div style="
      display:grid;
      grid-template-columns: auto auto auto;
      gap:4px 12px;
      font-size:12px;
      margin-top:6px;
      padding-left:32px;   
    ">
  `;

  Object.entries(irs.x).forEach(([subRace, [subWins, subGames]]) => {
    const subWR = subGames ? ((subWins / subGames) * 100).toFixed(1) : 0;

    html += `
      <span style="display:flex;align-items:center;gap:6px;">
        <span style="width:10px;height:10px;background:${raceColors[subRace]};display:inline-block;border-radius:2px;"></span>
        <span> Random -> ${raceNames[subRace]}</span>
      </span>
      <span style="text-align:right;">${subWins} / ${subGames}</span>
      <span style="text-align:right;font-weight:500;">${subWR}%</span>
    `;
  });

  html += `</div>`;
}

          tooltipEl.innerHTML = html;

          const rect = ctx.chart.canvas.getBoundingClientRect();
          let left = rect.left + window.pageXOffset + tooltip.caretX + 12;
          let top = rect.top + window.pageYOffset + tooltip.caretY;

          const tooltipRect = tooltipEl.getBoundingClientRect();
          if (left + tooltipRect.width + 20 > window.innerWidth) {
            left = rect.left + window.pageXOffset + tooltip.caretX - tooltipRect.width - 12;
          }
          if (top + tooltipRect.height + 20 > window.pageYOffset + window.innerHeight) {
            top = window.pageYOffset + window.innerHeight - tooltipRect.height - 20;
          }

          tooltipEl.style.left = `${left}px`;
          tooltipEl.style.top = `${top}px`;
          tooltipEl.style.opacity = 1;
        }
      }
    }
  }
});
}







/* Chart 5*/

async function loadTeamRaceFrequencyChart() {
  

const toggleBtn = document.getElementById("toggleTeamChart");
toggleBtn.replaceWith(toggleBtn.cloneNode(true));
const cleanToggleBtn = document.getElementById("toggleTeamChart");



const seasons = currentStatsScope === "all"
  ? await discoverSeasons()
  : [currentStatsScope];

const muwr = {};

for (const season of seasons) {
  const res = await fetchNoCache(`data/seasons/${season}/statistics_data.json`);
  const data = await res.json();

  for (const [matchup, vs] of Object.entries(data.muwr || {})) {
    muwr[matchup] ??= {};
    for (const [opp, [w, g]] of Object.entries(vs)) {
      muwr[matchup][opp] ??= [0, 0];
      muwr[matchup][opp][0] += w;
      muwr[matchup][opp][1] += g;
    }
  }
}


  const raceColors = {
    p: "#EBD678",
    t: "#53B3FC",
    z: "#C1A3F5",
    r: "#AABBCB"
  };


  const entries = Object.entries(muwr).map(([matchup, vsData]) => {
    let totalGames = 0;
    const sub = [];

    for (const [opponent, [wins, games]] of Object.entries(vsData)) {
      const g = games || 0;
      sub.push({ opponent, wins, games: g });
      totalGames += g;
    }

    return { matchup, totalGames, sub };
  });

  const grandTotalSelections = entries.reduce((s, e) => s + e.totalGames, 0);

  
  // Frequency sort
  
  entries.sort((a, b) => b.totalGames - a.totalGames);

  const freqLabels = entries.map(e => e.matchup.toUpperCase());
  const freqValues = entries.map(e => e.totalGames);

  
  // Win rate sort
  
  const wrSorted = [...entries].sort((a, b) => {
    const gamesA = a.sub.reduce((s, r) => s + r.games, 0);
    const gamesB = b.sub.reduce((s, r) => s + r.games, 0);
    const wrA = gamesA ? a.sub.reduce((s, r) => s + r.wins, 0) / gamesA : 0;
    const wrB = gamesB ? b.sub.reduce((s, r) => s + r.wins, 0) / gamesB : 0;
    return wrB - wrA;
  });

  const wrLabels = wrSorted.map(e => e.matchup.toUpperCase());
  const wrValues = wrSorted.map(e => {
    const wins = e.sub.reduce((s, r) => s + r.wins, 0);
    const games = e.sub.reduce((s, r) => s + r.games, 0);
    return games ? (wins / games * 100).toFixed(1) : 0;
  });

 
  let tooltipEl = document.getElementById("teamfreq-tooltip");
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "teamfreq-tooltip";
    Object.assign(tooltipEl.style, {
      position: "absolute",
      background: "rgba(0,0,0,0.85)",
      border: "1px solid #333",
      borderRadius: "8px",
      color: "#ddd",
      padding: "8px 12px",
      fontSize: "0.85em",
      pointerEvents: "none",
      boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
      zIndex: 10,
      opacity: 0,
      transition: "opacity 0.1s ease"
    });
    document.body.appendChild(tooltipEl);
  }


  function detailedTooltip(ctx, activeEntries) {
    const { chart, tooltip } = ctx;

    if (tooltip.opacity === 0) {
      tooltipEl.style.opacity = 0;
      return;
    }

    const index = tooltip.dataPoints?.[0]?.dataIndex;
    if (index == null) return;

    const e = activeEntries[index];
    const [r1, r2] = e.matchup.split("");

    const totalWins = e.sub.reduce((sum, s) => sum + s.wins, 0);
    const totalGames = e.sub.reduce((sum, s) => sum + s.games, 0);
    const overallWR = totalGames ? ((totalWins / totalGames) * 100).toFixed(1) : "0.0";

    const isWRView = ctx.chart.data.datasets[0].label.includes("Win Rate");

    let summaryHTML = "";

    if (!isWRView) {
      summaryHTML = `
        <div style="margin-bottom:2px;">
          Selected ${e.totalGames} times / ${grandTotalSelections} selections
          (${((e.totalGames / grandTotalSelections) * 100).toFixed(1)}%)
        </div>
        <div style="margin-bottom:6px;">
          ${totalWins} wins / ${totalGames} games (${overallWR}%)
        </div>`;
    } else {
      summaryHTML = `
        <div style="margin-bottom:2px;">
          ${totalWins} wins / ${totalGames} games (${overallWR}%)
        </div>
        <div style="margin-bottom:6px;">
          Selected ${e.totalGames} times / ${grandTotalSelections} selections
          (${((e.totalGames / grandTotalSelections) * 100).toFixed(1)}%)
        </div>`;
    }

    let html = `
      <div style="display:flex;align-items:center;gap:4px;margin-bottom:6px;">
        <span style="width:10px;height:10px;background:${raceColors[r1]};border-radius:2px;"></span>
        <span style="width:10px;height:10px;background:${raceColors[r2]};border-radius:2px;"></span>
        <strong style="color:#fff;">${e.matchup.toUpperCase()}</strong>
      </div>
      ${summaryHTML}
      <div style="
        display:grid;
        grid-template-columns:1fr auto auto auto;
        gap:4px 12px;
        font-size:12px;">
        <strong>Opponent</strong>
        <strong style="text-align:right;">Wins</strong>
        <strong style="text-align:right;">Games</strong>
        <strong style="text-align:right;">Win %</strong>
    `;

    e.sub
      .filter(s => s.games > 0)
      .sort((a, b) => b.games - a.games)
      .forEach(s => {
        const boxes = s.opponent.split("").map(r => `
          <span style="width:10px;height:10px;background:${raceColors[r]};border-radius:2px;margin-right:2px;"></span>
        `).join("");

        const wr = s.games ? ((s.wins / s.games) * 100).toFixed(1) : "0.0";

        html += `
          <div style="display:flex;align-items:center;gap:2px;">
            ${boxes}${s.opponent.toUpperCase()}
          </div>
          <span style="text-align:right;">${s.wins}</span>
          <span style="text-align:right;">${s.games}</span>
          <span style="text-align:right;">${wr}%</span>
        `;
      });

    html += "</div>";
    tooltipEl.innerHTML = html;

    const rect = chart.canvas.getBoundingClientRect();
    tooltipEl.style.opacity = 1;
    tooltipEl.style.left = rect.left + window.pageXOffset + tooltip.caretX + 12 + "px";
    tooltipEl.style.top = rect.top + window.pageYOffset + tooltip.caretY + "px";
  }

 
  // Shared tooltip options


  const chartOptions = (activeEntries, axisLabel, isWinRateView = false) => ({
    scales: {
      x: {
        grid: { color: "#222" },
        ticks: { color: "#ccc" }
      },
      y: {
        beginAtZero: true,
        // Conditionally set max: 100 for Win Rate view
        max: isWinRateView ? 100 : undefined, 
        grid: { color: "#222" },
        ticks: { color: "#ccc" },
        title: {
          display: true,
          text: axisLabel,
          color: "#ccc",
          font: { size: 13 }
        }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        external: ctx => detailedTooltip(ctx, activeEntries)
      }
    }
  });


  const canvas = document.getElementById("teamFreqChart");
  const ctx2d = canvas.getContext("2d");

  const labelEl = document.querySelector(".chart-labelx");


  let showingFreq = true;

  // initial chart


  let currentChart = new Chart(ctx2d, {
    type: "bar",
    data: {
      labels: freqLabels,
      datasets: [{
        label: "Selections",
        data: freqValues,
        backgroundColor:   CHART_COLORS.FREQUENCY_BAR,
        borderColor: CHART_COLORS.FREQUENCY_BORDER,
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    // Not Win Rate, so no third argument
    options: chartOptions(entries, "Number of Selections") 
  });


  teamFreqChartInstance = currentChart; 

  
  // Button toggle
  
  cleanToggleBtn.addEventListener("click", () => {
  currentChart.destroy();

  if (showingFreq) {
    currentChart = new Chart(ctx2d, {
      type: "bar",
      data: {
        labels: wrLabels,
        datasets: [{
          label: "Win Rate (%)",
          data: wrValues,
          backgroundColor: CHART_COLORS.WINRATE_BAR,
          borderColor: CHART_COLORS.WINRATE_BORDER,
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: chartOptions(wrSorted, "Win Rate (%)", true)
    });

    cleanToggleBtn.textContent = "Switch to Race Selection Rates View";
    labelEl.textContent = "Team Race Selection Win Rates";
  } else {
    currentChart = new Chart(ctx2d, {
      type: "bar",
      data: {
        labels: freqLabels,
        datasets: [{
          label: "Selections",
          data: freqValues,
          backgroundColor: CHART_COLORS.FREQUENCY_BAR,
          borderColor: CHART_COLORS.FREQUENCY_BORDER,
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: chartOptions(entries, "Number of Selections")
    });

    cleanToggleBtn.textContent = "Switch to Win Rate View";
    labelEl.textContent = "Team Race Selection Rates";
  }

  teamFreqChartInstance = currentChart;
  showingFreq = !showingFreq;
});
}






/* Chart 6*/


async function loadMatchupWinrateChart() {
 


const seasons = currentStatsScope === "all"
  ? await discoverSeasons()
  : [currentStatsScope];

const muwrr = {};

for (const season of seasons) {
  const res = await fetchNoCache(`data/seasons/${season}/statistics_data.json`);
  const data = await res.json();

  for (const [matchup, vs] of Object.entries(data.muwrr || {})) {
    muwrr[matchup] ??= {};
    for (const [opp, [w, g]] of Object.entries(vs)) {
      muwrr[matchup][opp] ??= [0, 0];
      muwrr[matchup][opp][0] += w;
      muwrr[matchup][opp][1] += g;
    }
  }
}



  const raceColors = {
    p: "#EBD678",
    t: "#53B3FC",
    z: "#C1A3F5",
    r: "#AABBCB"
  };

  const entries = Object.entries(muwrr).map(([matchup, vsData]) => {
    let totalWins = 0;
    let totalGames = 0;
    const sub = [];

    for (const [opponent, [wins, games]] of Object.entries(vsData)) {
      sub.push({ opponent, wins, games });
      totalWins += wins;
      totalGames += games;
    }

    const wr = totalGames ? (totalWins / totalGames) * 100 : 0;
    return { matchup, wr, totalWins, totalGames, sub };
  });

  entries.sort((a, b) => b.wr - a.wr);

  const labels = entries.map(e => e.matchup.toUpperCase());
  const winrates = entries.map(e => e.wr.toFixed(1));

  let tooltipEl = document.getElementById("matchup-tooltip");
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "matchup-tooltip";
    Object.assign(tooltipEl.style, {
      position: "absolute",
      background: "rgba(0,0,0,0.85)",
      border: "1px solid #333",
      borderRadius: "8px",
      color: "#ddd",
      padding: "8px 12px",
      fontSize: "0.85em",
      pointerEvents: "none",
      boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
      zIndex: 10,
      opacity: 0,
      transition: "opacity 0.1s ease"
    });
    document.body.appendChild(tooltipEl);
  }

  const canvas = document.getElementById("matchupChart");
const ctx2d = canvas.getContext("2d");


  matchupChartInstance = new Chart(ctx2d, {
  type: "bar",
  data: {
    labels,
    datasets: [{
      label: "Winrate %",
      data: winrates,
      backgroundColor: CHART_COLORS.WINRATE_BAR,
      borderColor: CHART_COLORS.WINRATE_BORDER,
      borderWidth: 1,
      borderRadius: 6
    }]
  },
  options: {
    scales: {
      x: { grid: { color: "#222" }, ticks: { color: "#ccc" } },
      y: { beginAtZero: true, max: 100, grid: { color: "#222" }, ticks: { color: "#ccc" } }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        external: ctx => {
            const tooltip = ctx.tooltip;
            if (!tooltip || !tooltip.opacity) {
              tooltipEl.style.opacity = 0;
              return;
            }

            const index = tooltip.dataPoints?.[0]?.dataIndex;
            if (index == null) return;
            const e = entries[index];
            const [r1, r2] = e.matchup.split("");

            let html = `
              <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                <span style="width:10px;height:10px;background:${raceColors[r1]};display:inline-block;border-radius:2px;"></span>
                <span style="width:10px;height:10px;background:${raceColors[r2]};display:inline-block;border-radius:2px;"></span>
                <strong style="color:#fff;">${e.matchup.toUpperCase()}</strong>
              </div>
              <div style="margin-bottom:6px;">${e.totalWins} wins / ${e.totalGames} games (${e.wr.toFixed(1)}%)</div>

              <div style="display:grid;grid-template-columns:1fr auto auto auto;gap:4px 12px;font-size:12px;align-items:center;">
                <strong>Opponent</strong><strong style="text-align:right;">Wins</strong><strong style="text-align:right;">Games</strong><strong style="text-align:right;">WR%</strong>
            `;

            e.sub
              .filter(s => s.games > 0)
              .sort((a, b) => (b.wins / b.games) - (a.wins / a.games))
              .forEach(s => {
                const races = s.opponent.toLowerCase().split("");
                const boxes = races
                  .map(r => `<span style="width:10px;height:10px;background:${raceColors[r] || "#999"};display:inline-block;border-radius:2px;"></span>`)
                  .join("");

                const subWr = ((s.wins / s.games) * 100).toFixed(1);

                html += `
                  <div style="display:flex;align-items:center;gap:4px;">
                    ${boxes}
                    <span>${s.opponent.toUpperCase()}</span>
                  </div>
                  <span style="text-align:right;">${s.wins}</span>
                  <span style="text-align:right;">${s.games}</span>
                  <span style="text-align:right;">${subWr}</span>
                `;
              });

            html += `</div>`;
            tooltipEl.innerHTML = html;

            const rect = ctx.chart.canvas.getBoundingClientRect();
            tooltipEl.style.left = `${rect.left + window.pageXOffset + tooltip.caretX + 12}px`;
            tooltipEl.style.top = `${rect.top + window.pageYOffset + tooltip.caretY}px`;
            tooltipEl.style.opacity = 1;
          }
        }
      }
    }
  });
}



















async function loadWinrateChart() {
  


const seasons = currentStatsScope === "all"
  ? await discoverSeasons()
  : [currentStatsScope];

const wlp = {};

for (const season of seasons) {
  const res = await fetchNoCache(`data/seasons/${season}/statistics_data.json`);
  const data = await res.json();

  for (const [k, v] of Object.entries(data.wlp || {})) {
    if (!wlp[k]) wlp[k] = Array.isArray(v) ? [0, 0] : { wins: 0, losses: 0 };

    if (Array.isArray(v)) {
      wlp[k][0] += v[0];
      wlp[k][1] += v[1];
    } else {
      wlp[k].wins += v.wins;
      wlp[k].losses += v.losses;
    }
  }
}

  const groups = {
    pz: ["ppzz", "pprz", "zzrp", "rprz"],
    tz: ["ttzz", "ttrz", "zzrt", "rtrz"],
    zz: ["zzzz", "zzrz", "rzrz"],
    pt: ["pptt", "pprt", "ttrp", "rprt"],
    pp: ["pppp", "pprp", "rprp"],
    tt: ["tttt", "ttrt", "rtrt"]
  };

  const subLabels = {
    ppzz: "Protoss + Zerg",
    pprz: "Protoss + Random → Zerg",
    zzrp: "Zerg + Random → Protoss",
    rprz: "Random → Protoss + Random → Zerg",    
    ttzz: "Terran + Zerg",
    ttrz: "Terran + Random → Zerg",
    zzrt: "Zerg + Random → Terran",
    rtrz: "Random → Terran + Random → Zerg",    
    zzzz: "Zerg + Zerg",
    zzrz: "Zerg + Random → Zerg",
    rzrz: "Random → Zerg + Random → Zerg",    
    pptt: "Protoss + Terran",
    pprt: "Protoss + Random → Terran",
    ttrp: "Terran + Random → Protoss",
    rprt: "Random → Protoss + Random → Terran",    
    pppp: "Protoss + Protoss",
    pprp: "Protoss + Random → Protoss",
    rprp: "Random → Protoss + Random → Protoss",    
    tttt: "Terran + Terran",
    ttrt: "Terran + Random → Terran",    
    rtrt: "Random → Terran + Random → Terran"
  };

  const raceColors = {
    p: "#EBD678",
    t: "#53B3FC",
    z: "#C1A3F5",
    r: "#AABBCB"
  };

  function sumWinsLosses(keys) {
    let wins = 0, losses = 0;
    for (const k of keys) {
      const d = wlp[k];
      if (!d) continue;
      if (Array.isArray(d)) {
        wins += d[0];
        losses += d[1] - d[0];
      } else if (typeof d === "object") {
        wins += d.wins || 0;
        losses += d.losses || 0;
      }
    }
    return { wins, losses, total: wins + losses };
  }

  // --- Compute and sort ---
  const groupData = Object.entries(groups).map(([label, keys]) => {
    const { wins, losses, total } = sumWinsLosses(keys);
    const winrate = total ? (wins / total) * 100 : 0;
    return { label, keys, wins, losses, total, winrate };
  });
  groupData.sort((a, b) => b.winrate - a.winrate); 

  const labels = groupData.map(g => g.label.toUpperCase());
  const winrates = groupData.map(g => g.winrate.toFixed(1));

  // --- Tooltip element ---
  let tooltipEl = document.getElementById("winrate-tooltip");
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "winrate-tooltip";
    Object.assign(tooltipEl.style, {
      position: "absolute",
      background: "rgba(0, 0, 0, 0.85)",
      color: "#ddd",
      borderRadius: "6px",
      padding: "8px 10px",
      pointerEvents: "none",
      fontSize: "13px",
      whiteSpace: "nowrap",
      transition: "all 0.1s ease",
      zIndex: 1000
    });
    document.body.appendChild(tooltipEl);
  }

  // draw chart


  const canvas = document.getElementById("winrateChart");
  const ctx2d = canvas.getContext("2d");



 winrateChartInstance = new Chart(ctx2d, {
  type: "bar",
  data: {
    labels,
    datasets: [{
      label: "Winrate %",
      data: winrates,
      backgroundColor: CHART_COLORS.WINRATE_BAR,
      borderColor: CHART_COLORS.WINRATE_BORDER,
      borderWidth: 1,
      borderRadius: 6
    }]
  },
  options: {
    indexAxis: "x",
    scales: {
      x: { grid: { color: "#222" }, ticks: { color: "#ccc" } },
      y: { beginAtZero: true, max: 100, grid: { color: "#222" }, ticks: { color: "#ccc" } }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: false,
        external: ctx => {
  const tooltip = ctx.tooltip;
  if (!tooltip || !tooltip.opacity) {
    tooltipEl.style.opacity = 0;
    return;
  }

  const index = tooltip.dataPoints?.[0]?.dataIndex;
  if (index == null) return;
  const g = groupData[index];
  const title = g.label.toUpperCase();
  const [r1, r2] = title.split("");

  const wr = g.total ? ((g.wins / g.total) * 100).toFixed(1) : 0;

  // Header
  let html = `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
      <span style="width:10px;height:10px;background:${raceColors[r1.toLowerCase()]};display:inline-block;border-radius:2px;"></span>
      <span style="width:10px;height:10px;background:${raceColors[r2.toLowerCase()]};display:inline-block;border-radius:2px;"></span>
      <strong style="color:#fff;">${title}</strong>
    </div>
  `;

 // Overall
html += `
  <div style="
    display:grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 4px 12px;
    font-size:12px;
    margin-bottom:6px;
    color:#ccc;   /* matched brightness */
    font-weight:600;
  ">
    <span>Overall</span>
    <span style="text-align:right;">${g.wins} wins</span>
    <span style="text-align:right;">${g.total} games</span>
    <span style="text-align:right;">${wr}%</span>
  </div>
`;

// Column headers
html += `
  <div style="
    display:grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 4px 12px;
    font-size:12px;
    margin-bottom:4px;
    color:#ccc;   /* matched brightness */
  ">
    <span></span>
    <span style="text-align:right;font-weight:600;">Wins</span>
    <span style="text-align:right;font-weight:600;">Games</span>
    <span style="text-align:right;font-weight:600;">WR%</span>
`;

  const subEntries = g.keys
    .map(key => {
      const d = wlp[key];
      if (!d) return null;
      const total = Array.isArray(d) ? d[1] : (d.wins + d.losses);
      const wins = Array.isArray(d) ? d[0] : d.wins;
      const wr = total ? (wins / total) * 100 : 0;
      return { key, wins, total, wr };
    })
    .filter(Boolean)
    .sort((a, b) => b.wr - a.wr);

for (const e of subEntries) {
  html += `
    <span style="opacity:0.9;">${subLabels[e.key]}</span>
    <span style="text-align:right;">${e.wins}</span>
    <span style="text-align:right;">${e.total}</span>
    <span style="text-align:right;">${e.wr.toFixed(1)}%</span>
  `;
}

html += `</div>`;

  tooltipEl.innerHTML = html;

  // ---------- Positioning ----------
  const rect = ctx.chart.canvas.getBoundingClientRect();
  tooltipEl.style.opacity = 1;

  let left = rect.left + window.pageXOffset + tooltip.caretX + 12;
  let top = rect.top + window.pageYOffset + tooltip.caretY;

  const tooltipRect = tooltipEl.getBoundingClientRect();
  const screenWidth = window.innerWidth;

  if (left + tooltipRect.width + 20 > screenWidth) {
    left = rect.left + window.pageXOffset + tooltip.caretX - tooltipRect.width - 12;
  }

  const screenHeight = window.innerHeight;
  if (top + tooltipRect.height + 20 > window.pageYOffset + screenHeight) {
    top = window.pageYOffset + screenHeight - tooltipRect.height - 20;
  }

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}
}
      }
    }
  });
}





async function loadAllStatisticsCharts() {
  await loadActivityChart();
  await loadActivityWeekdayChart();
  await loadActivityClockChart();
  await loadIndividualRaceSelectionChart();
  await loadTeamRaceFrequencyChart();
  await loadMatchupWinrateChart();
  await loadWinrateChart();
}

loadAllStatisticsCharts();