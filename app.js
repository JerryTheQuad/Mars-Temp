const API_URL = "/api/temperature";

const temperatureEl = document.getElementById("temperature");
const surfaceTempEl = document.getElementById("surface-temp");
const metricEl = document.getElementById("metric");
const sourceEl = document.getElementById("source");
const updatedEl = document.getElementById("updated");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refresh");

const formatTemp = (value) =>
  Number.isFinite(value) ? `${value.toFixed(0)} °C` : "—";

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

function applyCooldown(nextAllowedRefreshAt) {
  const nextDate = new Date(nextAllowedRefreshAt);
  if (Number.isNaN(nextDate.getTime())) return;

  const now = Date.now();
  const remainingMs = nextDate.getTime() - now;

  if (remainingMs <= 0) {
    refreshBtn.disabled = false;
    return;
  }

  refreshBtn.disabled = true;
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  statusEl.textContent += ` Следующее обновление источника через ~${remainingMinutes} мин.`;

  window.setTimeout(() => {
    refreshBtn.disabled = false;
  }, remainingMs);
}

async function loadMarsTemperature() {
  refreshBtn.disabled = true;
  statusEl.textContent = "Получаем данные с прокси…";

  try {
    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();

    temperatureEl.textContent = formatTemp(Number(payload.temperature_c));
    surfaceTempEl.textContent = formatTemp(Number(payload.surface_temperature_c));
    const gridLat = Number(payload.grid_point?.lat);
    const gridLon = Number(payload.grid_point?.lon);
    const gridText = Number.isFinite(gridLat) && Number.isFinite(gridLon)
      ? `${gridLat.toFixed(3)}°, ${gridLon.toFixed(0)}°`
      : "—";

    metricEl.textContent = `${payload.metric ?? "Tair"} (сеточная точка ${gridText})`;
    sourceEl.textContent = payload.source_url ?? "—";
    updatedEl.textContent = formatDateTime(payload.fetched_at);

    statusEl.textContent =
      "Данные загружены через кэшируемый API (лимит обновления источника: 1 раз/час).";
    applyCooldown(payload.next_allowed_refresh_at);

    if (!refreshBtn.disabled) {
      refreshBtn.disabled = false;
    }
  } catch (error) {
    statusEl.textContent =
      "Не удалось получить температуру с API. Проверьте деплой функции /api/temperature.";
    temperatureEl.textContent = "—";
    surfaceTempEl.textContent = "—";
    metricEl.textContent = "—";
    sourceEl.textContent = "—";
    updatedEl.textContent = "—";
    refreshBtn.disabled = false;
    console.error(error);
  }
}

refreshBtn.addEventListener("click", loadMarsTemperature);
loadMarsTemperature();
