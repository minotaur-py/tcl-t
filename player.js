// player.js
// Assumes script.js is loaded first and provides:
// getCurrentSeason(), timeAgo(), mostPlayedRace()

async function loadPlayerPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const playerId = urlParams.get("id");
  if (!playerId) return;

  const currentSeason = await getCurrentSeason();

  const [playerData, names, maps, ratings] = await Promise.all([
    fetchNoCache(`data/seasons/${currentSeason}/players/${playerId}.json`).then(r => r.json()),
    fetchNoCache(`data/seasons/${currentSeason}/names.json`).then(r => r.json()),
    fetchNoCache("data/maps.json").then(r => r.json()),
    fetchNoCache(`data/seasons/${currentSeason}/ratings.json`).then(r => r.json())
  ]);

  const playerName = names[playerId] || playerId;
  document.getElementById("playerNameHeader").textContent = playerName;

  // --- Get full player stats ---
  const allPlayers = Object.entries(ratings).map(([id, v]) => {
    const [games, mu, sigma, wins, p, t, z, r_, ts, , pW, tW, zW, rW, , rPw, rTw, rZw, rPl, rTl, rZl, points] = v;
    return {
      id, games, mu, sigma, wins,
      races: [p, t, z, r_],
      winsByRace: [pW, tW, zW, rW],
      randomSubWins: [rPw, rTw, rZw],
      randomSubLosses: [rPl, rTl, rZl],
      points
    };
  });

  const MIN_GAMES = 10;
  const eligiblePlayers = allPlayers.filter(p => p.games >= MIN_GAMES).sort((a, b) => b.points - a.points);
  const playerStats = allPlayers.find(p => p.id === playerId);
  if (!playerStats) return;

  const rankPlayer = eligiblePlayers.find(p => p.id === playerId);
  const points = playerStats.points.toFixed(0);
  const rank = rankPlayer ? eligiblePlayers.indexOf(rankPlayer) + 1 : "—";
  const mmr = playerStats.mu.toFixed(2);
  const winrate = ((playerStats.wins / playerStats.games) * 100).toFixed(1);

  const losses = playerStats.games - playerStats.wins;
  const mmrUncertainty = playerStats.sigma.toFixed(2);

  const countsForFunction = [
    playerStats.races[0], // Protoss
    playerStats.races[2], // Zerg
    playerStats.races[1], // Terran
    playerStats.races[3] // Random
  ];

  const mostPlayed = mostPlayedRace(countsForFunction);


  const raceColors = {
    Protoss: "#EBD678",
    Terran: "#53B3FC",
    Zerg: "#C1A3F5",
    Random: "#AABBCB"
  };
  const mostPlayedColor = raceColors[mostPlayed] || "#AABBCB"; 


function ratingToIcon(rating) {                                 /* already in script.js - dedupe */
  // determine bucket value (the third element in your ranges table)
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

  // map bucket → icon file
  if (bucket <= 1) return "icons/d1.jpg";
  if (bucket === 2) return "icons/d2.jpg";
  if (bucket === 3) return "icons/d3.jpg";

  if (bucket >= 4 && bucket <= 6) return `icons/c${bucket - 3}.jpg`;
  if (bucket >= 7 && bucket <= 9) return `icons/b${bucket - 6}.jpg`;
  if (bucket >= 10 && bucket <= 12) return `icons/a${bucket - 9}.jpg`;

  return "icons/s.jpg";
}


  const raceDisplayHTML = `
    <span style="
      display: inline-block;
      width: 10px;
      height: 10px;
      background: ${mostPlayedColor};
      border-radius: 2px;
      margin-right: 6px;
      vertical-align: middle;
    "></span>
    ${mostPlayed}
  `;



  const statsHTML = `
    <div style="font-size:0.86em; line-height:1.85; color:#ccc;">
      <table style="width:100%; border-collapse: collapse;">

          <tr>
           <td style="text-align: left; padding: 0;">Rank:</td>
           <td style="text-align: right; padding: 0;">${rank}</td>
         </tr>
         <tr>
           <td style="text-align: left; padding: 0;">Points:</td>
           <td style="text-align: right; padding: 0;">
  <span style="display:inline-flex; align-items:center; gap:6px;">
    <img
      src="${ratingToIcon(points)}"
      alt=""
      style="width:32px; height:16px; object-fit:contain;"
    >
    ${points}
  </span>
</td>
         </tr>


         <tr>
           <td style="text-align: left; padding: 0;">MMR:</td>
           <td style="text-align: right; padding: 0;">${mmr}</td>
         </tr>
         <tr>
           <td style="text-align: left; padding: 0;">MMR Uncertainty:</td>
           <td style="text-align: right; padding: 0;">${mmrUncertainty}</td>
         </tr>
         <tr>
           <td style="text-align: left; padding: 0;">Record:</td>
           <td style="text-align: right; padding: 0;">${playerStats.games}G ${playerStats.wins}W ${losses}L ${winrate}%</td>
         </tr>
         </table>
    </div>
  `;

  // Inject HTML into the page
  const overviewEl = document.getElementById("playeroverview-text");
  if (overviewEl) {
    overviewEl.innerHTML = statsHTML;
  }





  // --- Race Pie Chart ---
  const ctx = document.getElementById("raceChart")?.getContext?.("2d");
  function drawRaceChart() {
    if (!ctx) return;
    if (typeof Chart === "undefined") {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js";
      s.onload = drawRaceChart;
      document.head.appendChild(s);
      return;
    }

    const races = ["Protoss", "Terran", "Zerg", "Random"];
    const raceColors = {
      Protoss: "#EBD678",
      Terran: "#53B3FC",
      Zerg: "#C1A3F5",
      Random: "#AABBCB"
    };

    const raceCounts = playerStats.races;
    const raceWins = playerStats.winsByRace;
    const raceWinrates = raceCounts.map((count, i) =>
      count > 0 ? ((raceWins[i] / count) * 100).toFixed(1) : 0
    );

    // Create custom tooltip container
    let tooltipEl = document.getElementById("pie-tooltip");
    if (!tooltipEl) {
      tooltipEl = document.createElement("div");
      tooltipEl.id = "pie-tooltip";
      Object.assign(tooltipEl.style, {
        position: "absolute",
        background: "rgba(0,0,0,0.85)",
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

    new Chart(ctx, {
      type: "pie",
      data: {
        labels: races,
        datasets: [{
          data: raceCounts,
          backgroundColor: races.map(r => raceColors[r]),
          borderColor: "#222",
          borderWidth: 0
        }]
      },
      options: {
        plugins: {
          legend: {
            position: 'top',
            align: 'start',
            labels: { color: "#ddd" }
          },
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

              const race = races[index];
              const color = raceColors[race];
              const games = raceCounts[index];
              const wins = raceWins[index];
              const losses = games - wins;
              const rate = raceWinrates[index];

              // pluralization helper
              const plural = (n, word) => {
                if (word === "loss") return n === 1 ? "loss" : "losses";
                return n === 1 ? word : word + "s";
              };

              // --- Main race line ---
              let html = `
                <div style="display:grid;grid-template-columns:auto 1fr auto;column-gap:8px;align-items:center;font-weight:bold;">
                  <span style="width:10px;height:10px;background:${color};display:inline-block;border-radius:2px;"></span>
                  <span>${race}: ${wins} ${plural(wins, "win")}, ${losses} ${plural(losses, "loss")}</span>
                  <span style="text-align:right;min-width:50px;">${rate}%</span>
                </div>
              `;


              // --- Random subrace breakdowns ---
              if (race === "Random") {
                const subRaces = ["Protoss", "Terran", "Zerg"];
                subRaces.forEach((sr, idx) => {
                  const w = playerStats.randomSubWins[idx];
                  const l = playerStats.randomSubLosses[idx];
                  const total = w + l;
                  const subRate = total > 0 ? ((w / total) * 100).toFixed(1) : 0;
                  const subColor = raceColors[sr];

                  html += `
                    <div style="
                      display:grid;
                      grid-template-columns:5px 110px 50px 90px 50px;
                      column-gap:8px;
                      align-items:center;
                      font-family: monospace;
                      margin-top:2px;
                      margin-left:24px;
                    ">
                      <span style="width:8px;height:8px;background:${subColor};
                        display:inline-block;border-radius:2px;opacity:0.9;"></span>

                      <span style="opacity:0.85;">Random → ${sr}</span>

                      <span style="text-align:right;min-width:65px;opacity:0.85;">
                        ${w} ${plural(w,"win")}
                      </span>
                      <span style="text-align:right;min-width:75px;opacity:0.85;">
                        ${l} ${plural(l,"loss")}
                      </span>

                      <span style="text-align:right;min-width:50px;opacity:0.85;
                        font-weight:bold;">${subRate}%</span>
                    </div>
                  `;
                });
              }

              tooltipEl.innerHTML = html;

              const rect = ctx.chart.canvas.getBoundingClientRect();
              tooltipEl.style.opacity = 1;
              tooltipEl.style.left = rect.left + window.pageXOffset + tooltip.caretX + 12 + "px";
              tooltipEl.style.top = rect.top + window.pageYOffset + tooltip.caretY + "px";
            }
          }
        }
      }
    });
  }
  drawRaceChart();

  // --- Helper for race normalization ---
  function normalizeRace(race) {
    if (!race) return "";
    race = race.toLowerCase();
    if (["p", "pp"].includes(race)) return "p";
    if (["t", "tt"].includes(race)) return "t";
    if (["z", "zz"].includes(race)) return "z";
    if (["r", "rr"].includes(race)) return "r";
    if (["rp", "rt", "rz"].includes(race)) return race;
    return "unknown";
  }





















  // points progression
  const ratingCanvas = document.getElementById("ratingChart");
  if (ratingCanvas && playerData && playerData.length > 0) {
    const ratingCtx = ratingCanvas.getContext("2d");
    const ratingValues = playerData.map(m => m.rating);
    const gameIndices = ratingValues.map((_, i) => i + 1);

    // Normalize match metadata
    const matchMeta = playerData.map(match => ({
  winners: match.winners.map(
    ([id, race, , , , rating, ratingChange]) => ({
      name: names[id] || id,
      race: normalizeRace(race),
      rating,
      ratingChange
    })
  ),
  losers: match.losers.map(
    ([id, race, , , , rating, ratingChange]) => ({
      name: names[id] || id,
      race: normalizeRace(race),
      rating,
      ratingChange
    })
  )
}));

    const raceInfo = {
      p: { name: "Protoss", color: "#EBD678" },
      t: { name: "Terran", color: "#53B3FC" },
      z: { name: "Zerg", color: "#C1A3F5" },
      r: { name: "Random", color: "#AABBCB" },
      rp: { name: "Random → Protoss", color: "#EBD678" },
      rt: { name: "Random → Terran", color: "#53B3FC" },
      rz: { name: "Random → Zerg", color: "#C1A3F5" },
      unknown: { name: "Unknown", color: "#999" }
    };

    function drawRatingChart() {
      if (typeof Chart === "undefined") {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/chart.js";
        s.onload = drawRatingChart;
        document.head.appendChild(s);
        return;
      }

      // Create tooltip element once
      let tooltipEl = document.getElementById("chartjs-tooltip");
      if (!tooltipEl) {
        tooltipEl = document.createElement("div");
        tooltipEl.id = "chartjs-tooltip";
        Object.assign(tooltipEl.style, {
          position: "absolute",
          background: "rgba(0,0,0,0.85)",
          color: "#ddd",
          borderRadius: "6px",
          padding: "8px 10px",
          pointerEvents: "none",
          whiteSpace: "nowrap",
          fontSize: "13px",
          transition: "all 0.1s ease"
        });
        document.body.appendChild(tooltipEl);
      }

      new Chart(ratingCtx, {
        type: "line",
        data: {
          labels: gameIndices,
          datasets: [{
            label: "Points",
            data: ratingValues,
            borderColor: "#3b82f6",
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5,
            hitRadius: 30,
            pointBackgroundColor: "#3b82f6",
            tension: 0.25,
            fill: false
          }]
        },
        options: {
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

                const indices = (tooltip.dataPoints || []).map(dp => dp.dataIndex);
                if (!indices.length) return;

                const index = indices[indices.length - 1];
                const meta = matchMeta[index];
                if (!meta) return;

                const fmtTeam = (team, label, isWinner) => {
                  if (!team?.length) return "";
                  const players = team.map(p => {
                    const info = raceInfo[p.race] || raceInfo.unknown;
                    const baseColor = isWinner ? "#34D399" : "#F87171";
                    const change = p.ratingChange > 0
  ? `+${p.ratingChange.toFixed(0)}`
  : p.ratingChange.toFixed(0);
                    const changeColor = isWinner ? "#34D399" : "#F87171";
                    const ratingAfter = p.rating.toFixed(0);
                    const ratingBefore = (p.rating - p.ratingChange).toFixed(0);
                    const iconSrc = ratingToIcon(p.rating);
                    return `
                      <div style="
                        display: grid;
                        grid-template-columns: auto 1fr 0px min-content;
                        align-items: center;
                        column-gap: 4px;
                        font-family: monospace;
                        margin-bottom: 2px;
                        white-space: nowrap;
                      ">
                        <span style="color:${info.color};">■</span>
                        <span style="
                          overflow: hidden;
                          text-overflow: ellipsis;
                          max-width: 265px;
                          display: inline-block;
                          padding-right: 12px;
                        ">${p.name} (${info.name})</span>
                        <!-- ICON COLUMN -->
<span style="display:flex; justify-content:center;">
  <img
    src="${iconSrc}"
    alt=""
    style="width:22px; height:14px; object-fit:contain;"
  >
</span>




<!-- RATING COLUMN -->
<span style="
  text-align: right;
  min-width: 90px;
">
  ${ratingAfter}
  <span style="color:white;">(</span><span style="color:${changeColor};">${change}</span><span style="color:white;">)</span>
</span>
                      </div>`;
                  }).join("");
                  return `<div style="margin-top:4px;"><strong>${label}:</strong>${players}</div>`;
                };

                tooltipEl.innerHTML = `
                  <div style="font-weight:bold;color:#fff;">Game ${index + 1}</div>
                  ${fmtTeam(meta.winners, "Winners", true)}
                  ${fmtTeam(meta.losers, "Losers", false)}
                `;

                const rect = ctx.chart.canvas.getBoundingClientRect();
                tooltipEl.style.opacity = 1;
                tooltipEl.style.left = rect.left + window.pageXOffset + tooltip.caretX + 12 + "px";
                tooltipEl.style.top = rect.top + window.pageYOffset + tooltip.caretY + "px";
              }
            }
          },
          scales: {
            x: {
              title: { display: true, text: "Games", color: "#ccc" },
              ticks: {
                display: true, autoSkip: true,
                maxTicksLimit: 32
              },
              grid: { color: "#333" }
            },
            y: {
              title: { display: true, text: "Points", color: "#ccc" },
              ticks: { color: "#ccc" },
              grid: { color: "#333" }
            }
          }
        }
      });
    }








    drawRatingChart();
  }














  // --- Match list  ---
  const container = document.getElementById("matches");
  if (!container) return;

  function raceIcon(race) {
    const base = "icons";
    if (!race) return `${base}/unknown.png`;
    const raceMap = { tt: "t", pp: "p", zz: "z", rt: "r_t", rp: "r_p", rz: "r_z" };
    const key = raceMap[race.toLowerCase()] || "unknown";
    return `${base}/${key}.png`;
  }

function playerCard(p) {
  // Expected structure (same source as points chart):
  // [id, race, mu, sigma, muChange, points, pointsChange]
  const [id, race, mu, sigma, muChange, points, pointsChange] = p;

  const name = names[id] || id;

  // Points
  const pts = Number(points ?? 0).toFixed(0);
  const pointsIcon = ratingToIcon(Number(points ?? 0));
  const ptsDelta = pointsChange ?? 0;
  const ptsDeltaStr =
    ptsDelta > 0 ? `+${ptsDelta.toFixed(0)}` : ptsDelta.toFixed(0);
  const ptsColor =
    ptsDelta > 0 ? "#34D399" : ptsDelta < 0 ? "#F87171" : "#bbb";
 
  // MMR
  const rating = Number(mu).toFixed(2);
  const mmrDelta = muChange ?? 0;
  const mmrDeltaStr =
    mmrDelta > 0 ? `+${mmrDelta.toFixed(2)}` : mmrDelta.toFixed(2);
  const mmrColor =
    mmrDelta > 0 ? "#34D399" : mmrDelta < 0 ? "#F87171" : "#bbb";

  return `
    <div class="player-card">
      <img src="${raceIcon(race)}" class="race-icon">

      <a href="player.html?id=${id}" class="player-name">${name}</a>

      <div class="player-points" style="display:flex; align-items:center; gap:7px;">
  <img
    src="${pointsIcon}"
    alt=""
    style="width:28px; height:14px; object-fit:contain;"
  >
  <span>${pts}</span>
</div>


      <div class="player-points-change" style="color:${ptsColor}">${ptsDeltaStr}</div>



<div class="player-rating">${rating}</div>




      <div class="player-change" style="color:${mmrColor}">${mmrDeltaStr}</div>
    </div>
  `;
}

  container.innerHTML = "";
  (playerData || []).slice().reverse().forEach(match => {
    const isWin = match.winners.some(p => p[0] == playerId);
    const status = isWin ? "Win" : "Loss";
    const color = isWin ? "#34D399" : "#F87171";

    const leftTeam = isWin ? match.winners : match.losers;
    const rightTeam = isWin ? match.losers : match.winners;
    const leftPlayers = leftTeam.map(p => playerCard(p)).join("");
    const rightPlayers = rightTeam.map(p => playerCard(p)).join("");

    const timeString = timeAgo(match.end_time);
    const durationSec = Math.round((match.game_length || 0) / 1000);
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;
    const duration = `${minutes}:${seconds.toString().padStart(2, "0")} min`;
    const mapName = maps[match.map_id] || match.map_id;

    const row = document.createElement("div");
    row.className = "match-row";
    row.innerHTML = `
      <div class="match-status" style="color:${color}">
        ${status}<br><span class="ago">${timeString}</span>
      </div>
      <div class="team-column">${leftPlayers}</div>
      <div class="spacer"></div>
      <div class="team-column">${rightPlayers}</div>
      <div class="spacer"></div>
      <div class="match-info">
        <div>${mapName}</div>
        <div class="duration">${duration}</div>
      </div>
    `;
    container.appendChild(row);
  });
}

if (window.location.pathname.includes("player.html")) {
  loadPlayerPage();
}












(function () {
  const toggleBtn = document.getElementById("toggleExtraStats");
  const extraStats = document.getElementById("extra-stats");
  const chartToggleBtn = document.getElementById("chartModeToggle");
  const extraChart1Label = document.getElementById("extraChart1Label");

  let chartLoaded = false;
  let chartInstance = null;
  let cachedData = null;

  function updateExtraChartLabel(text) {
    extraChart1Label.textContent = text;
  }

  // ----------------------------------------------------
  // Expandable section toggle
  // ----------------------------------------------------
  toggleBtn.addEventListener("click", () => {
    const opened = extraStats.classList.toggle("open");
    toggleBtn.textContent = opened
      ? "Hide additional statistics"
      : "Show additional statistics";

if (opened && !chartLoaded) {
  const playerId = new URLSearchParams(window.location.search).get("id");
  if (playerId) {
    initChart(playerId);      // PWR
    loadMatchupChart(playerId);   // PWM
    loadDrawer3Chart(playerId);   // 
    loadDrawer4Chart(playerId);
    loadPlaceholderChart();
    chartLoaded = true;
  }
}
  });


let placeholderChartInstance = null;

function loadPlaceholderChart() {
  const ctx = document.getElementById("extraChart5")?.getContext("2d");
  if (!ctx) return;

  if (placeholderChartInstance) {
    placeholderChartInstance.destroy();
  }

  placeholderChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["A", "B", "C"],
      datasets: [{
        data: [1, 1, 1],
        backgroundColor: "#333333"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: "#222222" },
          ticks: { color: "#777777" }
        },
        y: {
          ticks: { color: "#777777" }
        }
      }
    }
  });
}





  // ----------------------------------------------------
  // Chart 1
  // ----------------------------------------------------
  async function initChart(playerId) {
    cachedData = await loadPlayerData(playerId);
    if (!cachedData) return;

    // Default chart
    drawGamesChart(cachedData);
    updateExtraChartLabel("Number of Games Played with Each Race");

    // INITIAL MODE
    chartToggleBtn.dataset.mode = "games";
    updateChartIndicator("games");

    // Show button
    chartToggleBtn.style.display = "inline-block";

    // Toggle handler
    chartToggleBtn.addEventListener("click", switchChart);

  
  }

  // ----------------------------------------------------
  // Fetch season data once
  // ----------------------------------------------------
async function loadPlayerData(playerId) {
  const season = await getCurrentSeason();
  const res = await fetchNoCache(`data/seasons/${season}/statistics_data.json`);
  if (!res.ok) return null;

  const data = await res.json();
  const player = data.pwr?.[playerId];
  if (!player) return null;

  function parse(entry) {
    if (!entry) return { total: 0, wins: 0, losses: 0, games: 0 };
    const [total, wins, losses] = entry;
    return {
      total: total ?? 0,
      wins: wins ?? 0,
      losses: losses ?? 0,
      games: (wins ?? 0) + (losses ?? 0)
    };
  }

  const p = parse(player.p);
  const t = parse(player.t);
  const z = parse(player.z);

return {
  raw: { p, t, z },

  games: {
    p: p.games,
    t: t.games,
    z: z.games
  },

  total: {
    p: p.total,
    t: t.total,
    z: z.total
  },

  perGame: {
    p: p.games > 0 ? p.total / p.games : 0,
    t: t.games > 0 ? t.total / t.games : 0,
    z: z.games > 0 ? z.total / z.games : 0
  },

  winrate: {
    p: p.games > 0 ? (p.wins / p.games) * 100 : 0,
    t: t.games > 0 ? (t.wins / t.games) * 100 : 0,
    z: z.games > 0 ? (z.wins / z.games) * 100 : 0
  }
};
}


const CHART_MODES = [
  "games",
  "winrate",
  "total",
  "pergame"
];


  // ----------------------------------------------------
  // Switch chart type
  // ----------------------------------------------------
function switchChart() {
  const current = chartToggleBtn.dataset.mode;
  const nextIndex = (CHART_MODES.indexOf(current) + 1) % CHART_MODES.length;
  const next = CHART_MODES[nextIndex];

  chartToggleBtn.dataset.mode = next;
  updateChartIndicator(next);

  if (next === "games") {
    drawGamesChart(cachedData);
    updateExtraChartLabel("Number of Games Played with Each Race");
    chartToggleBtn.textContent = "Show Win Rate";

  } else if (next === "winrate") {
    drawWinrateChart(cachedData);
    updateExtraChartLabel("Win Rate with Each Race");
    chartToggleBtn.textContent = "Show Total Points Gained";

  } else if (next === "total") {
    drawTotalChart(cachedData);
    updateExtraChartLabel("Points Gained with Each Race");
    chartToggleBtn.textContent = "Show Points per Game";

  } else {
    drawPerGameChart(cachedData);
    updateExtraChartLabel("Points Gained per Game with Each Race");
    chartToggleBtn.textContent = "Show Games Played";
  }
}


  // ----------------------------------------------------
  // Destroy previous chart safely
  // ----------------------------------------------------
  function resetChart() {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  }

function updateChartIndicator(mode) {
  const el = document.getElementById("extraChart1Indicator");
  if (!el) return;

  const map = {
    games: "(1/4)",
    winrate: "(2/4)",
    total: "(3/4)",
    pergame: "(4/4)"
  };

  el.textContent = map[mode] ?? "";
}




// A: games played

function drawGamesChart(data) {
  resetChart();

  const arr = [
    { label: "Protoss", value: data.games.p, color: "#EBD678" },
    { label: "Terran",  value: data.games.t, color: "#53B3FC" },
    { label: "Zerg",    value: data.games.z, color: "#C1A3F5" }
  ];

  const sorted = arr.sort((a, b) => b.value - a.value);
  const ctx = document.getElementById("extraChart1").getContext("2d");

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(x => x.label),
      datasets: [{
        data: sorted.map(x => x.value),
        backgroundColor: sorted.map(x =>
          x.value === 0 ? "#161616" : x.color
        )
      }]
    },
    options: chartOptions("games", data)
  });
}




















  // ----------------------------------------------------
  // Chart B: Total Points gained
  // ----------------------------------------------------
function drawTotalChart(data) {
  resetChart();

  // Build sortable list
  const arr = [
    { label: "Protoss", value: data.total.p, color: "#EBD678" },
    { label: "Terran",  value: data.total.t, color: "#53B3FC" },
    { label: "Zerg",    value: data.total.z, color: "#C1A3F5" }
  ];

  // Sort descending by MMR gained/lost
  const sorted = arr.sort((a, b) => b.value - a.value);

  const ctx = document.getElementById("extraChart1").getContext("2d");

  chartInstance = new Chart(ctx, {
  type: "bar",
  data: {
    labels: sorted.map(x => x.label),
    datasets: [{
      data: sorted.map(x => x.value),
      backgroundColor: sorted.map(x =>
        x.value === 0 ? "#161616" : x.color
      )
    }]
  },
  options: chartOptions("total", data)
});
}

// C PPG / race

function drawPerGameChart(data) {
  resetChart();

  // convert to sortable array
  const arr = [
    { label: "Protoss", value: data.perGame.p, color: "#EBD678" },
    { label: "Terran",  value: data.perGame.t, color: "#53B3FC" },
    { label: "Zerg",    value: data.perGame.z, color: "#C1A3F5" }
  ];

  const sorted = arr.sort((a, b) => b.value - a.value);

  const ctx = document.getElementById("extraChart1").getContext("2d");

  chartInstance = new Chart(ctx, {
  type: "bar",
  data: {
    labels: sorted.map(x => x.label),
    datasets: [{
      data: sorted.map(x => x.value),
      backgroundColor: sorted.map(x =>
        x.value === 0 ? "#161616" : x.color
      )
    }]
  },
  options: chartOptions("pergame", data)
});
}





// D  Winrate

function drawWinrateChart(data) {
  resetChart();

  const arr = [
    { label: "Protoss", value: data.winrate.p, color: "#EBD678" },
    { label: "Terran",  value: data.winrate.t, color: "#53B3FC" },
    { label: "Zerg",    value: data.winrate.z, color: "#C1A3F5" }
  ];

  const sorted = arr.sort((a, b) => b.value - a.value);

  const ctx = document.getElementById("extraChart1").getContext("2d");

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(x => x.label),
      datasets: [{
        data: sorted.map(x => x.value),
        backgroundColor: sorted.map(x =>
          x.value === 0 ? "#161616" : x.color
        )
      }]
    },
    options: chartOptions("winrate", data)
  });
}















function formatValue(value, mode) {
  if (mode === "winrate") {
    return value.toFixed(1) + "%";
  }

  if (mode === "total") {
    return Math.round(value).toString();
  }

  const rounded = Math.round(value * 100) / 100;
  return rounded.toString();
}




  // ----------------------------------------------------
  // Shared chart styling
  // ----------------------------------------------------
  function chartOptions(mode, playerStats, barThickness = 56) {

  // Create tooltip element once
  let tooltipEl = document.getElementById("bar-tooltip");
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "bar-tooltip";
    Object.assign(tooltipEl.style, {
      position: "absolute",
      background: "rgba(0,0,0,0.85)",
      color: "#ddd",
      borderRadius: "6px",
      padding: "7px 9px",
      pointerEvents: "none",
      fontSize: "13px",
      whiteSpace: "nowrap",
      transition: "opacity 0.1s ease",
      opacity: 0,
      zIndex: 1000
    });
    document.body.appendChild(tooltipEl);
  }

  const raceColors = {
    Protoss: "#EBD678",
    Terran: "#53B3FC",
    Zerg:   "#C1A3F5"
  };

  const labelToKey = { Protoss: "p", Terran: "t", Zerg: "z" };

  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",

    datasets: {
      bar: {
        barThickness: barThickness			
      }
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

  const dp = tooltip.dataPoints?.[0];
  if (!dp) return;

  const race = dp.label;
  const key = labelToKey[race];
  const stats = playerStats.raw[key];
  const { total, wins, losses, games } = stats;
  const wr = games > 0 ? (wins / games) * 100 : 0;
  const wrTxt = wr.toFixed(1) + "%";
  const color = raceColors[race];

  const plural = (n, w) =>
    w === "loss" ? (n === 1 ? "loss" : "losses") : (n === 1 ? w : w + "s");

  
let valueText;
if (mode === "pergame") {
  let perGame = games > 0 ? total / games : 0;
  if (perGame < 0) {
    valueText = `${formatValue(Math.abs(perGame), mode)} points lost per game.`;
  } else {
    valueText = `${formatValue(perGame, mode)} points gained per game.`;
  }
} else {
  if (total < 0) {
    valueText = `${Math.abs(total)} points lost.`;
  } else {
    valueText = `${total} points gained.`;
  }
}

  
let prefixText;
  if (mode === "games") {
    
    prefixText = `${games} ${plural(games, "game")}, ${wins} ${plural(wins, "win")}, ${losses} ${plural(losses, "loss")}, ${wrTxt}. `;
  } else {
    prefixText = `${wins} ${plural(wins, "win")}, ${losses} ${plural(losses, "loss")}, ${wrTxt}. `;
  }

  tooltipEl.innerHTML = `
    <div style="display:flex; align-items:center; font-weight:bold;">
      <span style="
        width:10px;height:10px;
        background:${color};
        display:inline-block;
        border-radius:2px;
        margin-right:6px;
      "></span>
      <span>${race}</span>
    </div>
    <div style="
      margin-top:4px;
      margin-left:16px;
      font-family:monospace;
      opacity:0.85;
    ">
      ${prefixText}${valueText}
    </div>
  `;

  // -----------------------------------------------------------
  // Accurate mouse positioning
  // -----------------------------------------------------------
  const rect = ctx.chart.canvas.getBoundingClientRect();
  const mouse = ctx.chart.tooltip?._eventPosition;

  let x = tooltip.caretX;
  let y = tooltip.caretY;

  if (mouse) {
    x = mouse.x;
    y = mouse.y;
  }

  const pageX = rect.left + window.pageXOffset + x;
  const pageY = rect.top + window.pageYOffset + y;

  tooltipEl.style.left = (pageX + 14) + "px";
  tooltipEl.style.top  = (pageY - 12) + "px";
  tooltipEl.style.opacity = 1;
}
      }
    },

    scales: {
      x: {
  beginAtZero: true,
  max: mode === "winrate" ? 100 : undefined,
  grid: { display: true, color: "#222222" },
  ticks: {
    color: "#AAAAAA",
    callback: v => mode === "winrate" ? v + "%" : v
  }
},
      y: {
        ticks: { color: "#AAAAAA" }
      }
    }
  };
}


















/* pwm start*/




let matchupChartInstance = null;
let matchupDataCache = null;


const MATCHUP_CHART_MODES = [
  "games",
  "winrate",
  "total",
  "pergame"
];


function updateMatchupChartIndicator(mode) {
  const el = document.getElementById("extraChart2Indicator");
  if (!el) return;

  const map = {
    games: "(1/4)",
    winrate: "(2/4)",
    total: "(3/4)",
    pergame: "(4/4)"
  };

  el.textContent = map[mode] ?? "";
}



function switchMatchupChart() {
  const btn = document.getElementById("chartModeToggle2");
  const labelEl = document.getElementById("extraChart2Label");

  const current = btn.dataset.mode;
  const nextIndex =
    (MATCHUP_CHART_MODES.indexOf(current) + 1) %
    MATCHUP_CHART_MODES.length;

  const next = MATCHUP_CHART_MODES[nextIndex];
  btn.dataset.mode = next;
  updateMatchupChartIndicator(next);

  if (next === "games") {
    drawMatchupChartGames(matchupDataCache);
    labelEl.textContent = "Number of Games Played with Each Team Comp.";
    btn.textContent = "Show Win Rate";

  } else if (next === "winrate") {
    drawMatchupChartWinrate(matchupDataCache);
    labelEl.textContent = "Win Rate with Each Team Comp.";
    btn.textContent = "Show Total Points Gained";

  } else if (next === "total") {
    drawMatchupChartTotal(matchupDataCache);
    labelEl.textContent = "Points Gained with Each Team Comp.";
    btn.textContent = "Show Points per Game";

  } else {
    drawMatchupChartPerGame(matchupDataCache);
    labelEl.textContent = "Points Gained per Game with Each Team Comp.";
    btn.textContent = "Show Games Played";
  }
}








async function loadMatchupChart(playerId) {
  const season = await getCurrentSeason();
  const res = await fetchNoCache(`data/seasons/${season}/statistics_data.json`);
  if (!res.ok) return;

  const data = await res.json();
  const matchups = data.pwm?.[playerId];
  if (!matchups) return;

 matchupDataCache = parseMatchupData(matchups);

// INITIAL MODE = games
drawMatchupChartGames(matchupDataCache);

const labelEl = document.getElementById("extraChart2Label");
const toggleEl = document.getElementById("chartModeToggle2");

labelEl.textContent = "Number of Games Played with Each Team Comp.";
toggleEl.dataset.mode = "games";
toggleEl.textContent = "Show Win Rate";
toggleEl.style.display = "inline-block";

toggleEl.onclick = switchMatchupChart;

}

// ======================================================================
// Parse pwm → usable list
// ======================================================================
function parseMatchupData(obj) {
  // helper: decide which teammate gets parentheses based on key[0]
  function decideParenthesis(playerRace, t1, t2) {
    // normalize
    const p = (playerRace || "").toUpperCase();
    const a = (t1 || "").toUpperCase();
    const b = (t2 || "").toUpperCase();

    // if teammates identical -> parenthesize first
    if (a === b) return { index: 1, race: a.toLowerCase() };

    // if first teammate matches player -> parenthesize first
    if (a === p) return { index: 1, race: a.toLowerCase() };

    // if second teammate matches player -> parenthesize second
    if (b === p) return { index: 2, race: b.toLowerCase() };

    // fallback -> parenthesize first
    return { index: 1, race: a.toLowerCase() };
  }

  function makeLabel(key) {
    if (!key || key.length < 3) return "";
    const player = key[0];
    const t1 = key[1].toUpperCase();
    const t2 = key[2].toUpperCase();

    const { index } = decideParenthesis(player, t1, t2);

    // DO NOT change the order — keep teammate order as-is,
    // only add parentheses around the chosen teammate
    if (index === 1) {
      return `(${t1})${t2}`;
    } else {
      return `${t1}(${t2})`;
    }
  }

  const entries = Object.entries(obj).map(([key, arr]) => {
    const [mmr, wins, losses] = arr ?? [0, 0, 0];
    const games = (wins ?? 0) + (losses ?? 0);

    // extract teammates in original order
    const teammateA = (key && key[1]) ? key[1].toUpperCase() : "";
    const teammateB = (key && key[2]) ? key[2].toUpperCase() : "";

    const { index: parenthesisIndex, race: parenthesisRace } =
      decideParenthesis(key && key[0], teammateA, teammateB);

return {
  key,
  label: makeLabel(key),

  teammateA,
  teammateB,
  parenthesisIndex,
  parenthesisRace,

  total: mmr ?? 0,
  wins: wins ?? 0,
  losses: losses ?? 0,
  games,
  perGame: games > 0 ? (mmr / games) : 0,
  winrate: games > 0 ? (wins / games) * 100 : 0
};
  });

  entries.sort((a, b) => b.total - a.total);
  return entries;
}

// ======================================================================
// Chart rendering
// ======================================================================
function resetMatchupChart() {
  if (matchupChartInstance) {
    matchupChartInstance.destroy();
    matchupChartInstance = null;
  }
}


// Chart A 

function drawMatchupChartGames(list) {
  resetMatchupChart();

  const sorted = [...list].sort((a, b) => b.games - a.games);
  const ctx = document.getElementById("extraChart2").getContext("2d");
  const thickness = calcBarThickness(sorted.length);

  matchupChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(x => x.label),
      datasets: [{
        data: sorted.map(x => x.games),
        backgroundColor: sorted.map(x =>
          x.games === 0 ? "#161616" : matchupColor(x.key)
        ),
        barThickness: thickness,
        maxBarThickness: 44
      }]
    },
    options: matchupChartOptions("games", sorted, thickness)
  });
}

// Chart B Win rate

function drawMatchupChartWinrate(list) {
  resetMatchupChart();

  const sorted = [...list].sort((a, b) => b.winrate - a.winrate);
  const ctx = document.getElementById("extraChart2").getContext("2d");
  const thickness = calcBarThickness(sorted.length);

  matchupChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(x => x.label),
      datasets: [{
        data: sorted.map(x => x.winrate),
        backgroundColor: sorted.map(x =>
          x.games === 0 ? "#161616" : matchupColor(x.key)
        ),
        barThickness: thickness,
        maxBarThickness: 44
      }]
    },
    options: matchupChartOptions("winrate", sorted, thickness)
  });
}

















function drawMatchupChartTotal(list) {
  resetMatchupChart();

  const ctx = document.getElementById("extraChart2").getContext("2d");
  const thickness = calcBarThickness(list.length);

  matchupChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: list.map(x => x.label),
      datasets: [{
        data: list.map(x => x.total),
        backgroundColor: list.map(x => matchupColor(x.key)),
        barThickness: thickness,       // ← dynamic thickness
        maxBarThickness: 44            // ← safety cap (optional)
      }]
    },
    options: matchupChartOptions("total", list, thickness)
  });
}

function drawMatchupChartPerGame(list) {
  resetMatchupChart();

  // independent per-game order
  const sorted = [...list].sort((a, b) => b.perGame - a.perGame);

  const ctx = document.getElementById("extraChart2").getContext("2d");
  const thickness = calcBarThickness(sorted.length);

  matchupChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(x => x.label),
      datasets: [{
        data: sorted.map(x => x.perGame),
        backgroundColor: sorted.map(x => matchupColor(x.key)),
        barThickness: thickness,
        maxBarThickness: 44
      }]
    },
    options: matchupChartOptions("pergame", sorted, thickness)
  });
}

// ======================================================================
// Colors
// ======================================================================
function matchupColor(key) {
  const race = key[0];
  return {
    p: "#EBD678",
    t: "#53B3FC",
    z: "#C1A3F5"
  }[race] ?? "#999";
}


function calcBarThickness(listLength) {               /* brukes av chart2 per nå  */
  const max = 42;
  const quota = 132;
  if (listLength <= 0) return max;
  return Math.min(max, Math.floor(quota / listLength));
}

function calcBarThicknessHigh(listLength) {
  const max = 44;
  const quota = 192;                   /* GJELDER4 */
  if (listLength <= 0) return max;
  return Math.min(max, Math.floor(quota / listLength));
}


function calcBarThickness44(listLength) {
  const max = 44;
  const quota = 192;                   /* GJELDER4 */
  if (listLength <= 0) return max;
  return Math.min(max, Math.floor(quota / listLength));
}


function calcBarThicknessHigh3(listLength) {
  const max = 44;
  const quota = 250;                   /* GJELDER 3  */
  if (listLength <= 0) return max;
  
  return Math.min(max, Math.floor(quota / listLength));
}



// ======================================================================
// Tooltip + chart options
// ======================================================================
function matchupChartOptions(mode, list, barThickness = 44) {
  let tooltipEl = document.getElementById("bar-tooltip-matchups");
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "bar-tooltip-matchups";
    Object.assign(tooltipEl.style, {
      position: "absolute",
      background: "rgba(0,0,0,0.85)",
      color: "#ddd",
      borderRadius: "6px",
      padding: "7px 9px",
      pointerEvents: "none",
      fontSize: "13px",
      whiteSpace: "nowrap",
      transition: "opacity 0.1s ease",
      opacity: 0,
      zIndex: 1000
    });
    document.body.appendChild(tooltipEl);
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",

    datasets: {
      bar: {
        
        barThickness,
        
        maxBarThickness: 44
      }
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

    const dp = tooltip.dataPoints?.[0];
    if (!dp) return;

    const entry = list[dp.dataIndex];
    const { label, wins, losses, games, total, perGame } = entry;

    const wr = games > 0 ? (wins / games) * 100 : 0;

    const plural = (n, w) =>
    w === "loss" ? (n === 1 ? "loss" : "losses") : (n === 1 ? w : w + "s");

    let prefixText = "";
  if (mode === "games") {
    prefixText = `${games} ${plural(games, "game")}, ${wins} ${plural(wins, "win")}, ${losses} ${plural(losses, "loss")}, ${wr.toFixed(1)}%. `;
  } else {
    prefixText = `${wins} ${plural(wins, "win")}, ${losses} ${plural(losses, "loss")}, ${wr.toFixed(1)}%. `;
  }

    

   
    let valueText = "";

if (mode === "pergame") {
  if (perGame < 0) {
    valueText = `${formatValue(Math.abs(perGame), mode)} points lost per game.`;
  } else {
    valueText = `${formatValue(perGame, mode)} points gained per game.`;
  }
} else {
  if (total < 0) {
    valueText = `${Math.abs(total)} points lost.`;
  } else {
    valueText = `${total} points gained.`;
  }
}

    // Teammate colors
    const raceA = entry.teammateA.toLowerCase();
    const raceB = entry.teammateB.toLowerCase();
    const colors = { p: "#EBD678", t: "#53B3FC", z: "#C1A3F5" };
    const c1 = colors[raceA] || "#999";
    const c2 = colors[raceB] || "#999";

    tooltipEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:3px;font-weight:bold;margin-bottom:3px;">
        <span style="width:10px;height:10px;background:${c1};display:inline-block;border-radius:2px;"></span>
        <span style="width:10px;height:10px;background:${c2};display:inline-block;border-radius:2px;"></span>
        <span>${label}</span>
      </div>

      <div style="font-family:monospace; opacity:0.85;">
        ${prefixText}${valueText}
      </div>
    `;

    // Tooltip positioning
    const rect = ctx.chart.canvas.getBoundingClientRect();
    const mouse = ctx.chart.tooltip?._eventPosition;
    let x = mouse ? mouse.x : tooltip.caretX;
    let y = mouse ? mouse.y : tooltip.caretY;

    let tooltipX = rect.left + window.pageXOffset + x + 14;
    let tooltipY = rect.top + window.pageYOffset + y - 12;

    const ttWidth = tooltipEl.offsetWidth;
    const ttHeight = tooltipEl.offsetHeight;
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

    if (tooltipX + ttWidth > viewportWidth - 6) tooltipX = viewportWidth - ttWidth - 6;
    if (tooltipX < 0) tooltipX = 0;
    if (tooltipY + ttHeight > viewportHeight - 8) tooltipY = viewportHeight - ttHeight - 8;
    if (tooltipY < 0) tooltipY = 0;

    tooltipEl.style.left = tooltipX + "px";
    tooltipEl.style.top  = tooltipY + "px";
    tooltipEl.style.opacity = 1;
  }
}
    },

    scales: {
      x: {
        beginAtZero: true,
         min: mode === "winrate" ? 0 : undefined,
        max: mode === "winrate" ? 100 : undefined,
        grid: { color: "#222" },
        ticks: { color: "#AAA",
        callback: function(value) {
            return mode === "winrate" ? value + "%" : value;
          }        
 }
      },
      y: {
        ticks: { color: "#AAA" }
      }
    }
  };
}






















/*            Drawer 3 */



let drawer3ChartInstance = null;
let drawer3DataCache = null;


const DRAWER3_CHART_MODES = [
  "games",
  "winrate",
  "total",
  "pergame"
];

function updateDrawer3ChartIndicator(mode) {
  const el = document.getElementById("extraChart3Indicator");
  if (!el) return;

  const map = {
    games: "(1/4)",
    winrate: "(2/4)",
    total: "(3/4)",
    pergame: "(4/4)"
  };

  el.textContent = map[mode] ?? "";
}




// ======================================================================
// Drawer 3
// ======================================================================
async function loadDrawer3Chart(playerId) {
  const season = await getCurrentSeason();
  const res = await fetchNoCache(`data/seasons/${season}/statistics_data.json`);
  if (!res.ok) return;

  const data = await res.json();
  const raw = data.drawer3?.[playerId];
  if (!raw) return;

  // parse
  drawer3DataCache = parseDrawer3Data(raw);

  // dynamic chart height
  updateExtraChart3Height(drawer3DataCache.length);



  // UI wiring
  const labelEl = document.getElementById("extraChart3Label");
  const toggleEl = document.getElementById("chartModeToggle3");

  labelEl.textContent = "Number of Games Played for Each Matchup";
toggleEl.dataset.mode = "games";
toggleEl.textContent = "Show Win Rate";
toggleEl.style.display = "inline-block";

updateDrawer3ChartIndicator("games");



drawDrawer3Games(drawer3DataCache);




toggleEl.onclick = () => {
  const current = toggleEl.dataset.mode;
  const next =
    DRAWER3_CHART_MODES[
      (DRAWER3_CHART_MODES.indexOf(current) + 1) %
      DRAWER3_CHART_MODES.length
    ];

  toggleEl.dataset.mode = next;
  updateDrawer3ChartIndicator(next);

  if (next === "games") {
    drawDrawer3Games(drawer3DataCache);
    labelEl.textContent = "Number of Games Played for Each Matchup";
    toggleEl.textContent = "Show Win Rate";

  } else if (next === "winrate") {
    drawDrawer3Winrate(drawer3DataCache);
    labelEl.textContent = "Win Rate for Each Matchup";
    toggleEl.textContent = "Show Total Points Gained";

  } else if (next === "total") {
    drawDrawer3Total(drawer3DataCache);
    labelEl.textContent = "Points Gained for Each Matchup";
    toggleEl.textContent = "Show Points per Game";

  } else {
    drawDrawer3PerGame(drawer3DataCache);
    labelEl.textContent = "Points Gained per Game for Each Matchup";
    toggleEl.textContent = "Show Games Played";
  }

  updateExtraChart3Height(drawer3DataCache.length);
};
}



// ======================================================================
// Compute + apply dynamic height for Extra Chart 3
// ======================================================================
function updateExtraChart3Height(barCount) {
  // base height: how tall chart should be for up to ~10 bars
  const base = 340;  

  // how many bars beyond 10
  const extraBars = Math.max(0, barCount - 10);

  // pixels added per extra bar
  const perBar = 24;  

  const height = base + extraBars * perBar;

  const container = document.getElementById("extraChart3Container");
  if (container) {
    container.style.height = height + "px";
  }
}


// ======================================================================
// Parse drawer3 → list usable by charts
// ======================================================================
function parseDrawer3Data(obj) {
  // same parenthesis-decider logic but adapted for 5-letter key
  function decideParenthesis(playerRace, t1, t2) {
    const p = (playerRace || "").toUpperCase();
    const a = (t1 || "").toUpperCase();
    const b = (t2 || "").toUpperCase();

    if (a === b) return { index: 1, race: a.toLowerCase() };
    if (a === p) return { index: 1, race: a.toLowerCase() };
    if (b === p) return { index: 2, race: b.toLowerCase() };
    return { index: 1, race: a.toLowerCase() };
  }

  function makeLabel(key5) {
    // key5 example: ztzpt  (0..4)
    if (!key5 || key5.length < 5) return "";

    const p = key5[0];
    const t1 = key5[1].toUpperCase();
    const t2 = key5[2].toUpperCase();
    const o1 = key5[3].toUpperCase();
    const o2 = key5[4].toUpperCase();

    const { index } = decideParenthesis(p, t1, t2);

    // Keep teammate order exactly as in key (t1 then t2),
    // only add parentheses around the chosen teammate.
    const teammatesPart = (index === 1) ? `(${t1})${t2}` : `${t1}(${t2})`;

    // keep opponents order unchanged
    return `${teammatesPart} vs ${o1}${o2}`;
  }

  return Object.entries(obj).map(([key, arr]) => {
    const [mmr, wins, losses] = arr ?? [0, 0, 0];
    const games = (wins ?? 0) + (losses ?? 0);

    const teammateA = (key && key[1]) ? key[1].toUpperCase() : "";
    const teammateB = (key && key[2]) ? key[2].toUpperCase() : "";
    const opponentA = (key && key[3]) ? key[3].toUpperCase() : "";
    const opponentB = (key && key[4]) ? key[4].toUpperCase() : "";

    const { index: parenthesisIndex, race: parenthesisRace } =
      decideParenthesis(key && key[0], teammateA, teammateB);

    return {
      key,
      label: makeLabel(key),
      teammateA,
      teammateB,
      opponentA,
      opponentB,
      parenthesisIndex,
      parenthesisRace,
      total: mmr ?? 0,
      wins: wins ?? 0,
      losses: losses ?? 0,
      games,
      perGame: games > 0 ? mmr / games : 0
    };
  }).sort((a, b) => b.total - a.total);
}

// ======================================================================
// Reset
// ======================================================================
function resetDrawer3Chart() {
  if (drawer3ChartInstance) {
    drawer3ChartInstance.destroy();
    drawer3ChartInstance = null;
  }
}

// ======================================================================
// Draw total
// ======================================================================
function drawDrawer3Total(list) {
  resetDrawer3Chart();

  const ctx = document.getElementById("extraChart3").getContext("2d");
  const thickness = Math.max(14, calcBarThicknessHigh(list.length));

  drawer3ChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: list.map(x => x.label),
      datasets: [{
        data: list.map(x => x.total),
        backgroundColor: list.map(x => matchupColor(x.key[0])),
        barThickness: thickness,
        maxBarThickness: 44
      }]
    },
    options: drawer3ChartOptions("total", list, thickness)
  });
}

// ======================================================================
// Draw per game
// ======================================================================
function drawDrawer3PerGame(list) {
  resetDrawer3Chart();

  // independent sorting
  const sorted = [...list].sort((a, b) => b.perGame - a.perGame);

  const ctx = document.getElementById("extraChart3").getContext("2d");
  const thickness = Math.max(14, calcBarThicknessHigh(list.length));

  drawer3ChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(x => x.label),
      datasets: [{
        data: sorted.map(x => x.perGame),
        backgroundColor: sorted.map(x => matchupColor(x.key[0])),
        barThickness: thickness,
        maxBarThickness: 44
      }]
    },
    options: drawer3ChartOptions("pergame", sorted, thickness)
  });
}


function drawDrawer3Games(list) {
  resetDrawer3Chart();

  const sorted = [...list].sort((a, b) => b.games - a.games);
  const ctx = document.getElementById("extraChart3").getContext("2d");
  const thickness = Math.max(14, calcBarThicknessHigh(sorted.length));

  drawer3ChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(x => x.label),
      datasets: [{
        data: sorted.map(x => x.games),
        backgroundColor: sorted.map(x => matchupColor(x.key[0])),
        barThickness: thickness,
        maxBarThickness: 44
      }]
    },
    options: drawer3ChartOptions("games", sorted, thickness)
  });
}


function drawDrawer3Winrate(list) {
  resetDrawer3Chart();

  const sorted = [...list].sort(
    (a, b) => (b.games ? b.wins / b.games : 0) - (a.games ? a.wins / a.games : 0)
  );

  const ctx = document.getElementById("extraChart3").getContext("2d");
  const thickness = Math.max(14, calcBarThicknessHigh(sorted.length));

  drawer3ChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(x => x.label),
      datasets: [{
        data: sorted.map(x => x.games ? (x.wins / x.games) * 100 : 0),
        backgroundColor: sorted.map(x => matchupColor(x.key[0])),
        barThickness: thickness,
        maxBarThickness: 44
      }]
    },
    options: drawer3ChartOptions("winrate", sorted, thickness)
  });
}




// ======================================================================
// Tooltip
// ======================================================================
function drawer3ChartOptions(mode, list, barThickness) {
  let tooltipEl = document.getElementById("bar-tooltip-drawer3");
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "bar-tooltip-drawer3";
    Object.assign(tooltipEl.style, {
      position: "absolute",
      background: "rgba(0,0,0,0.85)",
      color: "#ddd",
      borderRadius: "6px",
      padding: "7px 9px",
      pointerEvents: "none",
      fontSize: "13px",
      whiteSpace: "nowrap",
      transition: "opacity 0.1s ease",
      opacity: 0,
      zIndex: 1000
    });
    document.body.appendChild(tooltipEl);
  }

  const colors = {
    p: "#EBD678",
    t: "#53B3FC",
    z: "#C1A3F5"
  };

  function pluralize(count, singular, plural = null) {
    if (plural === null) plural = singular + "s";
    return count === 1 ? singular : plural;
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",

    datasets: {
      bar: {
        barThickness,
        maxBarThickness: 44
      }
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

          const dp = tooltip.dataPoints?.[0];
          if (!dp) return;

          const entry = list[dp.dataIndex];
          const {
  wins,
  losses,
  games,
  total,
  perGame,
  parenthesisIndex
} = entry;

          const wr = games > 0 ? (wins / games) * 100 : 0;
          let prefixText = "";

if (mode === "games") {
  prefixText =
    `${games} ${pluralize(games, "game")}, ` +
    `${wins} ${pluralize(wins, "win")}, ` +
    `${losses} ${pluralize(losses, "Loss", "Losses")}, ` +
    `${wr.toFixed(1)}%. `;
} else {
  prefixText =
    `${wins} ${pluralize(wins, "win")}, ` +
    `${losses} ${pluralize(losses, "loss", "losses")}, ` +
    `${wr.toFixed(1)}%. `
;
}

let valueText = "";


if (mode === "winrate") {
  
  valueText = "";

} else if (mode === "pergame") {
  valueText =
    perGame < 0
      ? `${formatValue(Math.abs(perGame), "pergame")} points lost per game.`
      : `${formatValue(perGame, "pergame")} points gained per game.`;

} else {
  
  valueText =
    total < 0
      ? `${Math.abs(total)} points lost.`
      : `${total} points gained.`;
}


          // Teammates + opponents letters
          const tA = (entry.teammateA || "").toUpperCase();
          const tB = (entry.teammateB || "").toUpperCase();
          const oA = (entry.opponentA || "").toUpperCase();
          const oB = (entry.opponentB || "").toUpperCase();

          const teamLabel = parenthesisIndex === 2 ? `${tA}(${tB})` : `(${tA})${tB}`;
          const oppLabel = `${oA}${oB}`;

tooltipEl.innerHTML = `
  <div style="display:flex;align-items:center;gap:12px;font-weight:700;margin-bottom:4px;color:inherit;">
    <div style="display:flex;align-items:center;gap:3px;">
      <span style="width:10px;height:10px;background:${colors[tA.toLowerCase()] || '#666'};display:inline-block;border-radius:2px;"></span>
      <span style="width:10px;height:10px;background:${colors[tB.toLowerCase()] || '#666'};display:inline-block;border-radius:2px;"></span>
      <span style="font-family:monospace;font-size:14px;letter-spacing:0;color:inherit;">${teamLabel}</span>
    </div>
    <div style="opacity:1;color:inherit;font-weight:700;font-size:14px;">vs</div>
    <div style="display:flex;align-items:center;gap:3px;">
      <span style="width:10px;height:10px;background:${colors[oA.toLowerCase()] || '#666'};display:inline-block;border-radius:2px;"></span>
      <span style="width:10px;height:10px;background:${colors[oB.toLowerCase()] || '#666'};display:inline-block;border-radius:2px;"></span>
      <span style="font-family:monospace;font-size:14px;letter-spacing:0;color:inherit;">${oppLabel}</span>
    </div>
  </div>

<div style="font-family:monospace; font-size:13px; opacity:0.85; line-height:1.2;">
  ${prefixText}${valueText}
</div>
`;

          const rect = ctx.chart.canvas.getBoundingClientRect();
          const mouse = ctx.chart.tooltip?._eventPosition;
          const x = mouse ? mouse.x : tooltip.caretX;
          const y = mouse ? mouse.y : tooltip.caretY;

          tooltipEl.style.left = (rect.left + window.pageXOffset + x + 14) + "px";
          tooltipEl.style.top  = (rect.top + window.pageYOffset + y - 12) + "px";
          tooltipEl.style.opacity = 1;
        }
      }
    },

    scales: {
      x: { 
           min: mode === "winrate" ? 0 : undefined,
        max: mode === "winrate" ? 100 : undefined,
           beginAtZero: true,

           grid: { color: "#222" }, 
           ticks: { color: "#AAA",
           callback: function(value) {
            return mode === "winrate" ? value + "%" : value;
          }


 } },
      y: { ticks: { color: "#AAA" } }
    }
  };
}



















/* end of drawer3  */














let drawer4ChartInstance = null;
let drawer4DataCache = null;


const DRAWER4_CHART_MODES = [
  "games",
  "winrate",
  "total",
  "pergame"
];

function updateDrawer4ChartIndicator(mode) {
  const el = document.getElementById("extraChart4Indicator");
  if (!el) return;

  const map = {
    games: "(1/4)",
    winrate: "(2/4)",
    total: "(3/4)",
    pergame: "(4/4)"
  };

  el.textContent = map[mode] ?? "";
}


// Names cache for seasons
let drawer4NamesCache = {};

// Load names once per season
async function loadNames(season) {
  if (drawer4NamesCache[season]) {
    return drawer4NamesCache[season];
  }

  try {
    const res = await fetchNoCache(`data/seasons/${season}/names.json`);
    const json = await res.json();
    drawer4NamesCache[season] = json;
    return json;
  } catch (err) {
    console.error("[drawer4] names.json error:", err);
    return {};
  }
}

// Update container height based on number of bars
function updateExtraChart4Height(barCount) {
  const base = 340;
  const extra = Math.max(0, barCount - 10);
  const height = base + extra * 24;

  const container = document.getElementById("extraChart4Container");
  if (container) {
    container.style.height = height + "px";
  }
}

async function loadDrawer4Chart(playerId) {
  const season = await getCurrentSeason();

  let stats, names;
  try {
    [stats, names] = await Promise.all([
      fetchNoCache(`data/seasons/${season}/statistics_data.json`).then(r => r.json()),
      loadNames(season)
    ]);
  } catch (err) {
    console.error("[drawer4] loading error:", err);
    return;
  }

  const raw = stats?.drawer4?.[playerId];
  if (!raw) return;

  drawer4DataCache = parseDrawer4Data(raw, names);
  updateExtraChart4Height(drawer4DataCache.length);

  drawDrawer4Total(drawer4DataCache);

  const labelEl = document.getElementById("extraChart4Label");
  const toggleEl = document.getElementById("chartModeToggle4");

  if (!labelEl || !toggleEl) return;

  labelEl.textContent = "Number of Games Played with Each Ally";
toggleEl.dataset.mode = "games";
toggleEl.textContent = "Show Win Rates";
toggleEl.style.display = "inline-block";

updateDrawer4ChartIndicator("games");
drawDrawer4Games(drawer4DataCache);

toggleEl.onclick = () => {
  const current = toggleEl.dataset.mode;
  const next =
    DRAWER4_CHART_MODES[
      (DRAWER4_CHART_MODES.indexOf(current) + 1) %
      DRAWER4_CHART_MODES.length
    ];

  toggleEl.dataset.mode = next;
  updateDrawer4ChartIndicator(next);

  if (next === "games") {
    drawDrawer4Games(drawer4DataCache);
    labelEl.textContent = "Number of Games Played with Each Ally";
    toggleEl.textContent = "Show Win Rates";

  } else if (next === "winrate") {
    drawDrawer4WinRate(drawer4DataCache);
    labelEl.textContent = "Win Rates with Regular Allies";
    toggleEl.textContent = "Show Total Points Gained";

  } else if (next === "total") {
    drawDrawer4Total(drawer4DataCache);
    labelEl.textContent = "Points Gained with Each Ally";
    toggleEl.textContent = "Show Points per Game";

  } else {
    drawDrawer4PerGame(drawer4DataCache);
    labelEl.textContent = "Points Gained per Game with Each Ally";
    toggleEl.textContent = "Show Games Played";
  }

  updateExtraChart4Height(drawer4DataCache.length);
};
}



// Parse raw drawer4 data
function parseDrawer4Data(obj, names) {
  return Object.entries(obj || {})
    .map(([allyId, arr]) => {
      const [mmr, wins, losses] = arr ?? [0, 0, 0];
      const games = (wins ?? 0) + (losses ?? 0);
      const winRate = games > 0 ? wins / games : 0;

      return {
        allyId,
        allyName: names?.[allyId] || allyId,
        total: mmr ?? 0,
        wins: wins ?? 0,
        losses: losses ?? 0,
        games,
        perGame: games > 0 ? mmr / games : 0,
        winRate
      };
    })
    .sort((a, b) => b.total - a.total);
}

// Reset old chart
function resetDrawer4Chart() {
  if (drawer4ChartInstance) {
    try { drawer4ChartInstance.destroy(); } catch {}
    drawer4ChartInstance = null;
  }
}

// Color Helpers
function mmrColor(v) {
  if (v >= 0) {
    const t = Math.min(v / 50, 1);
    return interpolateColor("#444444", "#32AA5E", t);
  } else {
    const t = Math.min(Math.abs(v) / 50, 1);
    return interpolateColor("#444444", "#BA5531", t);
  }
}

function interpolateColor(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const b2 = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r},${g},${b2})`;
}

function hexToRgb(hex) {
  const v = parseInt(hex.replace("#", ""), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 };
}

function makeMmrColorFunction(list, mode) {
  const values = list.map(x => (mode === "total" ? x.total : x.perGame));
  const maxAbs = Math.max(...values.map(v => Math.abs(v))) || 1;

  return function (v) {
    const t = Math.min(Math.abs(v) / maxAbs, 1);
    if (v >= 0) {
      return interpolateColor("#444444", "#32AA5E", t);
    } else {
      return interpolateColor("#444444", "#BA5531", t);
    }
  };
}

// Draw TOTAL MMR
function drawDrawer4Total(list) {
  resetDrawer4Chart();

  const canvas = document.getElementById("extraChart4");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const thickness = Math.max(14, calcBarThicknessHigh(list.length));
  const colorFn = makeMmrColorFunction(list, "total");

  drawer4ChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: list.map(x => x.allyName),
      datasets: [{
        data: list.map(x => x.total),
        backgroundColor: list.map(x => colorFn(x.total)),
        barThickness: thickness,
        maxBarThickness: 44
      }]
    },
    options: drawer4ChartOptions("total", list, thickness)
  });
}

// Draw MMR per game
function drawDrawer4PerGame(list) {
  resetDrawer4Chart();

  const sorted = [...list].sort((a, b) => b.perGame - a.perGame);

  const canvas = document.getElementById("extraChart4");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const thickness = Math.max(14, calcBarThicknessHigh(list.length));
  const colorFn = makeMmrColorFunction(sorted, "pergame");

  drawer4ChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(x => x.allyName),
      datasets: [{
        data: sorted.map(x => x.perGame),
        backgroundColor: sorted.map(x => colorFn(x.perGame)),
        barThickness: thickness,
        maxBarThickness: 44
      }]
    },
    options: drawer4ChartOptions("pergame", sorted, thickness)
  });
}



function drawDrawer4Games(list) {
  resetDrawer4Chart();

  const sorted = [...list].sort((a, b) => b.games - a.games);

  const canvas = document.getElementById("extraChart4");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const thickness = Math.max(14, calcBarThicknessHigh(sorted.length));

  drawer4ChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(x => x.allyName),
      datasets: [{
        data: sorted.map(x => x.games),
        backgroundColor: "#4A6FA5",
        barThickness: thickness,
        maxBarThickness: 44
      }]
    },
    options: drawer4ChartOptions("games", sorted, thickness)
  });
}






function winRateColor(wr) {
  // wr is 0–1
  const t = Math.max(0, Math.min((wr - 0.5) / 0.5, 1));
  return interpolateColor("#444444", "#32AA5E", t);
}


function drawDrawer4WinRate(list) {
  resetDrawer4Chart();

  const MIN_GAMES = 5;

  const filtered = list.filter(x => x.games >= MIN_GAMES);
  if (filtered.length === 0) return;

  const sorted = filtered.sort((a, b) => b.winRate - a.winRate);

  const canvas = document.getElementById("extraChart4");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const thickness = calcBarThickness44(sorted.length);

  drawer4ChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sorted.map(x => x.allyName),
      datasets: [{
        data: sorted.map(x => +(x.winRate * 100).toFixed(1)),
        backgroundColor: sorted.map(x => winRateColor(x.winRate)),
        barThickness: thickness,
        maxBarThickness: 440
      }]
    },
    options: drawer4ChartOptions("winrate", sorted, thickness)
  });
}



















function plural(n, singular, pluralForm) {
  if (!pluralForm) {
    // common irregulars
    if (singular === "loss") pluralForm = "losses";
    else pluralForm = singular + "s";
  }
  return `${n} ${n === 1 ? singular : pluralForm}`;
}




// chart options (tooltip, axes)
function drawer4ChartOptions(mode, list, barThickness) {
  let tooltipEl = document.getElementById("bar-tooltip-drawer4");
  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.id = "bar-tooltip-drawer4";
    Object.assign(tooltipEl.style, {
      position: "absolute",
      background: "rgba(0,0,0,0.85)",
      color: "#ddd",
      borderRadius: "6px",
      padding: "7px 9px",
      pointerEvents: "none",
      fontSize: "13px",
      whiteSpace: "nowrap",
      transition: "opacity 0.1s ease",
      opacity: 0,
      zIndex: 1000
    });
    document.body.appendChild(tooltipEl);
  }

  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",

    datasets: {
      bar: { barThickness, maxBarThickness: 44 }
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

  const dp = tooltip.dataPoints?.[0];
  if (!dp) return;

  const entry = list[dp.dataIndex];
  const { allyName, wins, losses, games, total, perGame } = entry;
  const wr = games > 0 ? (wins / games) * 100 : 0;
const wrText = `${wr.toFixed(1)}%`;

let bodyHtml;







if (mode === "winrate") {
  bodyHtml = `
    ${plural(games, "game")}.
    ${plural(wins, "win")}, ${plural(losses, "loss")}.
    ${wrText} win rate.
  `;
} else if (mode === "games") {
  bodyHtml = `
    ${plural(games, "game")}. 
    ${plural(wins, "win")}, ${plural(losses, "loss")}, ${wrText}. 
    ${formatValue(Math.abs(total), "total")} points ${total >= 0 ? "gained." : "lost."}
  `;
} else {
  const value = mode === "total" ? total : perGame;
  const absVal = formatValue(Math.abs(value), mode);

  bodyHtml = `
    ${plural(wins, "win")}, ${plural(losses, "loss")}, ${wrText}. 
    ${absVal} ${value < 0
      ? (mode === "total" ? "points lost." : "points lost per game.")
      : (mode === "total" ? "points gained." : "points gained per game.")}
  `;
}





tooltipEl.innerHTML = `
  <div style="font-weight:bold;margin-bottom:3px;">${allyName}</div>
  <div style="font-family:monospace; opacity:0.85;">
    ${bodyHtml}
  </div>
`;


const rect = ctx.chart.canvas.getBoundingClientRect();
    const mouse = ctx.chart.tooltip?._eventPosition;
    const x = mouse ? mouse.x : tooltip.caretX;
    const y = mouse ? mouse.y : tooltip.caretY;

// Desired position
let tooltipX = rect.left + window.pageXOffset + x + 14;
let tooltipY = rect.top + window.pageYOffset + y - 12;

// Tooltip size
const ttWidth  = tooltipEl.offsetWidth;
const ttHeight = tooltipEl.offsetHeight;

const viewportWidth  = window.visualViewport?.width  ?? window.innerWidth;
const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

// Clamp horizontally
if (tooltipX + ttWidth > viewportWidth - 6) {
  tooltipX = viewportWidth - ttWidth - 6;
}
if (tooltipX < 0) {
  tooltipX = 0;
}






tooltipEl.style.left = tooltipX + "px";
tooltipEl.style.top  = tooltipY + "px";
tooltipEl.style.opacity = 1;
}
      }
    },

    scales: {
  x: {
    min: mode === "winrate" ? 0 : undefined,
    max: mode === "winrate" ? 100 : undefined,
    beginAtZero: true,
    grid: { color: "#222" },
    ticks: {
      color: "#AAA",
      callback: function (value) {
        return mode === "winrate" ? value + "%" : value;
      }
    }
  },
  y: {
    ticks: { color: "#AAA" }
  }
}
  };
}



















})();