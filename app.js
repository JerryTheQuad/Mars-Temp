const NASA_BASE_URL = "https://psg.gsfc.nasa.gov/apps/mars/";
const AIR_PARAM = "Tair";
const SURFACE_PARAM = "Tsurf";

// Значения совпадают с дефолтной локацией на сайте NASA Mars Explorer.
const NASA_DEFAULT_LOCATION = {
  name: "Syrtis Major",
  lat: 9.9,
  lon: 70,
};

const temperatureEl = document.getElementById("temperature");
const surfaceTempEl = document.getElementById("surface-temp");
const metricEl = document.getElementById("metric");
const sourceEl = document.getElementById("source");
const updatedEl = document.getElementById("updated");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refresh");

const formatTemp = (value) =>
  Number.isFinite(value) ? `${value.toFixed(0)} °C` : "—";

const nearestIndex = (arr, target) => {
  let idx = 0;
  let minDiff = Number.POSITIVE_INFINITY;

  for (let i = 0; i < arr.length; i += 1) {
    const diff = Math.abs(arr[i] - target);
    if (diff < minDiff) {
      minDiff = diff;
      idx = i;
    }
  }

  return idx;
};

function getPointValue(payload, coords) {
  const { header, data } = payload;

  if (!header || !Array.isArray(data) || data.length === 0) {
    throw new Error("Некорректный ответ NASA");
  }

  const nlon = Number(header.nlon);
  const lats = header.lats ?? [];
  const lons = header.lons ?? [];

  if (!Number.isFinite(nlon) || !lats.length || !lons.length) {
    throw new Error("В ответе NASA отсутствует сетка координат");
  }

  const latIdx = nearestIndex(lats, coords.lat);
  const lonIdx = nearestIndex(lons, coords.lon);
  const pointIndex = latIdx * nlon + lonIdx;

  return {
    value: Number(data[pointIndex]),
    lat: lats[latIdx],
    lon: lons[lonIdx],
    unit: header.unit ?? "C",
  };
}

async function fetchParam(param) {
  const response = await fetch(`${NASA_BASE_URL}index.php?param=${param}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} (${param})`);
  }

  return response.json();
}

async function loadMarsTemperature() {
  refreshBtn.disabled = true;
  statusEl.textContent = "Получаем данные NASA…";

  try {
    const [airPayload, surfacePayload] = await Promise.all([
      fetchParam(AIR_PARAM),
      fetchParam(SURFACE_PARAM),
    ]);

    const air = getPointValue(airPayload, NASA_DEFAULT_LOCATION);
    const surface = getPointValue(surfacePayload, NASA_DEFAULT_LOCATION);

    temperatureEl.textContent = formatTemp(air.value);
    surfaceTempEl.textContent = formatTemp(surface.value);
    metricEl.textContent = `${AIR_PARAM} (air, 1 scale height), сетка ${air.lat.toFixed(3)}°, ${air.lon.toFixed(0)}°`;
    sourceEl.textContent = "https://psg.gsfc.nasa.gov/apps/mars/";
    updatedEl.textContent = new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());

    statusEl.textContent =
      "Показана температура как на NASA Mars Explorer (без автообновления).";
  } catch (error) {
    statusEl.textContent =
      "Не удалось получить температуру с NASA Mars Explorer. Попробуйте позже.";
    temperatureEl.textContent = "—";
    surfaceTempEl.textContent = "—";
    metricEl.textContent = "—";
    sourceEl.textContent = "—";
    updatedEl.textContent = "—";
    console.error(error);
  } finally {
    refreshBtn.disabled = false;
  }
}

refreshBtn.addEventListener("click", loadMarsTemperature);
loadMarsTemperature();
