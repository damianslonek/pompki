const STORAGE_KEY = "pompki_app_v2";
const LEGACY_STORAGE_KEY = "pompki_app_v1";
const TAB_KEY = "pompki_active_tab";
const STATS_MONTH_OFFSET_KEY = "pompki_stats_month_offset";

const goalInput = document.getElementById("goalInput");
const saveGoalBtn = document.getElementById("saveGoalBtn");
const pushupInput = document.getElementById("pushupInput");
const addPushupsBtn = document.getElementById("addPushupsBtn");
const quickAddButtons = document.querySelectorAll(".quickAddBtn");
const clearTodayBtn = document.getElementById("clearTodayBtn");

const tabButtons = document.querySelectorAll(".tab-btn");
const trainingPanel = document.getElementById("trainingPanel");
const statsPanel = document.getElementById("statsPanel");

const goalInfo = document.getElementById("goalInfo");
const todayTotal = document.getElementById("todayTotal");
const goalProgress = document.getElementById("goalProgress");
const progressFill = document.getElementById("progressFill");
const currentTimeInfo = document.getElementById("currentTimeInfo");
const monthLabel = document.getElementById("monthLabel");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const monthTotal = document.getElementById("monthTotal");
const monthAverage = document.getElementById("monthAverage");
const activeDays = document.getElementById("activeDays");
const bestDay = document.getElementById("bestDay");
const yearTotal = document.getElementById("yearTotal");
const allTimeTotal = document.getElementById("allTimeTotal");
const dailyBars = document.getElementById("dailyBars");
const dailyEmpty = document.getElementById("dailyEmpty");
const entriesList = document.getElementById("entriesList");
const emptyState = document.getElementById("emptyState");
const yearTotalLabel = document.getElementById("yearTotalLabel");
const storageWarning = document.getElementById("storageWarning");

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

let storageAvailable = true;

function readStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (_error) {
    storageAvailable = false;
    return null;
  }
}

function writeStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
    storageAvailable = true;
    return true;
  } catch (_error) {
    storageAvailable = false;
    return false;
  }
}

function renderStorageWarning() {
  if (!storageWarning) return;
  storageWarning.hidden = storageAvailable;
}

function loadData() {
  const raw = readStorageItem(STORAGE_KEY) || readStorageItem(LEGACY_STORAGE_KEY);

  if (!raw) {
    return {
      goal: 100,
      entries: []
    };
  }

  try {
    const parsed = JSON.parse(raw);
    const safeEntries = Array.isArray(parsed.entries)
      ? parsed.entries.filter((entry) => entry && typeof entry.date === "string" && Number(entry.value) > 0)
      : [];

    return {
      goal: Number(parsed.goal) > 0 ? Math.floor(Number(parsed.goal)) : 100,
      entries: safeEntries.map((entry) => ({
        id: String(entry.id || crypto.randomUUID()),
        date: entry.date,
        value: Math.floor(Number(entry.value)),
        createdAt: Number(entry.createdAt) || Date.now()
      }))
    };
  } catch (_error) {
    return {
      goal: 100,
      entries: []
    };
  }
}

function saveData() {
  writeStorageItem(STORAGE_KEY, JSON.stringify(data));
  renderStorageWarning();
}

let data = loadData();
saveData();
let lastRenderedDayKey = getTodayKey();
let viewedMonthOffset = Math.min(Number(readStorageItem(STATS_MONTH_OFFSET_KEY)) || 0, 0);

function getTodayEntries() {
  const today = getTodayKey();
  return data.entries
    .filter((entry) => entry.date === today)
    .sort((a, b) => b.createdAt - a.createdAt);
}

function getTodayTotal() {
  return getTodayEntries().reduce((sum, entry) => sum + entry.value, 0);
}

function getMonthDateFromOffset(offset) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + offset, 1);
}

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function getDaysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function getMonthEntries(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();

  return data.entries.filter((entry) => {
    const date = new Date(`${entry.date}T00:00:00`);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

function getMonthTotalsByDay() {
  const totals = {};
  const monthDate = getMonthDateFromOffset(viewedMonthOffset);

  for (const entry of getMonthEntries(monthDate)) {
    const day = Number(entry.date.slice(-2));
    totals[day] = (totals[day] || 0) + entry.value;
  }

  return totals;
}

function getYearTotal(year) {

  return data.entries.reduce((sum, entry) => {
    const entryYear = Number(entry.date.slice(0, 4));
    return entryYear === year ? sum + entry.value : sum;
  }, 0);
}

function getAllTimeTotal() {
  return data.entries.reduce((sum, entry) => sum + entry.value, 0);
}

function getMonthSummary() {
  const totalsByDay = getMonthTotalsByDay();
  const values = Object.values(totalsByDay);
  const total = values.reduce((sum, value) => sum + value, 0);
  const monthDate = getMonthDateFromOffset(viewedMonthOffset);
  const now = new Date();
  const daysInMonth = getDaysInMonth(monthDate);
  const denominator = isSameMonth(now, monthDate) ? now.getDate() : daysInMonth;
  const avgPerDay = denominator > 0 ? Math.round(total / denominator) : 0;
  const activeDaysCount = values.filter((value) => value > 0).length;
  const best = values.length ? Math.max(...values) : 0;

  return {
    totalsByDay,
    total,
    avgPerDay,
    activeDaysCount,
    best
  };
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateTimeInfo() {
  const now = new Date();
  const tzLabel = new Intl.DateTimeFormat("pl-PL", { timeZoneName: "short" })
    .formatToParts(now)
    .find((part) => part.type === "timeZoneName")?.value || "";

  currentTimeInfo.textContent = `Czas lokalny: ${now.toLocaleTimeString("pl-PL")} ${tzLabel}`;

  const todayKey = getTodayKey();
  if (todayKey !== lastRenderedDayKey) {
    lastRenderedDayKey = todayKey;
    render();
  }
}

function setActiveTab(tabName) {
  const isTraining = tabName === "training";

  trainingPanel.classList.toggle("active", isTraining);
  statsPanel.classList.toggle("active", !isTraining);

  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  writeStorageItem(TAB_KEY, tabName);
  renderStorageWarning();
}

function renderEntries() {
  const entries = getTodayEntries();
  entriesList.innerHTML = "";

  if (entries.length === 0) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  for (const entry of entries) {
    const li = document.createElement("li");
    li.className = "entry";

    li.innerHTML = `
      <div>
        <strong>${entry.value} pompek</strong><br />
        <small>${formatTime(entry.createdAt)}</small>
      </div>
      <button data-id="${entry.id}">Usuń</button>
    `;

    entriesList.appendChild(li);
  }
}

function renderDailyBars(monthSummary) {
  dailyBars.innerHTML = "";

  const now = new Date();
  const monthDate = getMonthDateFromOffset(viewedMonthOffset);
  const daysToShow = isSameMonth(now, monthDate) ? now.getDate() : getDaysInMonth(monthDate);
  const goal = Number(data.goal) || 0;
  const values = [];

  for (let day = 1; day <= daysToShow; day += 1) {
    values.push(monthSummary.totalsByDay[day] || 0);
  }

  const hasData = values.some((value) => value > 0);
  dailyEmpty.style.display = hasData ? "none" : "block";

  if (!hasData) {
    return;
  }

  const maxValue = Math.max(...values, goal, 1);

  for (let day = 1; day <= daysToShow; day += 1) {
    const value = monthSummary.totalsByDay[day] || 0;
    const widthPercent = Math.round((value / maxValue) * 100);

    const row = document.createElement("div");
    row.className = "day-bar";

    row.innerHTML = `
      <span class="day-label">${String(day).padStart(2, "0")}</span>
      <span class="day-track"><span class="day-fill" style="width:${widthPercent}%"></span></span>
      <span class="day-value">${value}</span>
    `;

    dailyBars.appendChild(row);
  }
}

function renderStats() {
  const today = getTodayTotal();
  const goal = Number(data.goal) || 0;
  const progress = goal > 0 ? Math.round((today / goal) * 100) : 0;
  const monthSummary = getMonthSummary();
  const monthDate = getMonthDateFromOffset(viewedMonthOffset);

  goalInfo.textContent = `Cel: ${goal}`;
  todayTotal.textContent = `${today} pompek`;
  goalProgress.textContent = `Postęp celu: ${progress}%`;
  progressFill.style.width = `${Math.min(progress, 100)}%`;

  monthLabel.textContent = monthDate.toLocaleDateString("pl-PL", {
    month: "long",
    year: "numeric"
  });
  nextMonthBtn.disabled = viewedMonthOffset === 0;

  monthTotal.textContent = monthSummary.total;
  monthAverage.textContent = monthSummary.avgPerDay;
  activeDays.textContent = monthSummary.activeDaysCount;
  bestDay.textContent = monthSummary.best;
  const viewedYear = monthDate.getFullYear();
  yearTotal.textContent = getYearTotal(viewedYear);
  yearTotalLabel.textContent = ` w roku ${viewedYear}`;
  allTimeTotal.textContent = getAllTimeTotal();

  renderDailyBars(monthSummary);
}

function render() {
  lastRenderedDayKey = getTodayKey();
  renderStats();
  renderEntries();
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    return "unsupported";
  }

  if (Notification.permission === "granted") {
    return "granted";
  }

  if (Notification.permission === "denied") {
    return "denied";
  }

  try {
    return await Notification.requestPermission();
  } catch (_error) {
    return "denied";
  }
}

async function showRemainingGoalNotification() {
  const goal = Number(data.goal) || 0;
  if (goal <= 0) return;

  const today = getTodayTotal();
  const remaining = Math.max(goal - today, 0);
  if (remaining <= 0) return;

  const permission = await requestNotificationPermission();
  if (permission !== "granted") return;

  const title = "Pompki - cel dzienny";
  const body = `Brakuje Ci jeszcze ${remaining} pompek do osiągnięcia dzisiejszego celu!`;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.showNotification(title, {
        body,
        tag: "remaining-goal",
        renotify: true
      });
      return;
    }
  } catch (_error) {
    // Fall back to Notification constructor when SW notification is unavailable.
  }

  try {
    new Notification(title, {
      body,
      tag: "remaining-goal"
    });
  } catch (_error) {
    // Ignore notification errors in blocked environments.
  }
}

async function addPushups(value) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    alert("Podaj poprawną liczbę pompek.");
    return;
  }

  data.entries.push({
    id: crypto.randomUUID(),
    date: getTodayKey(),
    value: numericValue,
    createdAt: Date.now()
  });

  saveData();
  pushupInput.value = "";
  render();
  await showRemainingGoalNotification();
}

saveGoalBtn.addEventListener("click", () => {
  const value = Number(goalInput.value);

  if (!Number.isInteger(value) || value <= 0) {
    alert("Podaj poprawny cel dzienny.");
    return;
  }

  data.goal = value;
  saveData();
  goalInput.value = "";
  render();
});

addPushupsBtn.addEventListener("click", () => {
  addPushups(pushupInput.value);
});

pushupInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addPushups(pushupInput.value);
  }
});

goalInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    saveGoalBtn.click();
  }
});

quickAddButtons.forEach((button) => {
  button.addEventListener("click", () => {
    addPushups(button.dataset.value);
  });
});

entriesList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  const id = button.dataset.id;
  data.entries = data.entries.filter((entry) => entry.id !== id);
  saveData();
  render();
});

clearTodayBtn.addEventListener("click", () => {
  const today = getTodayKey();
  const hasEntries = data.entries.some((entry) => entry.date === today);

  if (!hasEntries) {
    return;
  }

  const confirmed = confirm("Na pewno usunąć wszystkie dzisiejsze wpisy?");
  if (!confirmed) {
    return;
  }

  data.entries = data.entries.filter((entry) => entry.date !== today);
  saveData();
  render();
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab);
  });
});

prevMonthBtn.addEventListener("click", () => {
  viewedMonthOffset -= 1;
  writeStorageItem(STATS_MONTH_OFFSET_KEY, String(viewedMonthOffset));
  renderStorageWarning();
  render();
});

nextMonthBtn.addEventListener("click", () => {
  if (viewedMonthOffset === 0) return;
  viewedMonthOffset += 1;
  writeStorageItem(STATS_MONTH_OFFSET_KEY, String(viewedMonthOffset));
  renderStorageWarning();
  render();
});

setActiveTab(readStorageItem(TAB_KEY) || "training");
render();
renderStorageWarning();
updateTimeInfo();
setInterval(updateTimeInfo, 1000);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Ignore registration errors in unsupported/blocked environments.
    });
  });
}
