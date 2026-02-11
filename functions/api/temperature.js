const NASA_BASE_URL = "https://psg.gsfc.nasa.gov/apps/mars/";
const AIR_PARAM = "Tair";
const SURFACE_PARAM = "Tsurf";
const CACHE_TTL_SECONDS = 60 * 60;

const NASA_DEFAULT_LOCATION = {
  name: "Syrtis Major",
  lat: 9.9,
  lon: 70,
};

const formatIso = (date) => date.toISOString();

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
  };
}

async function fetchParam(param) {
  const response = await fetch(`${NASA_BASE_URL}index.php?param=${param}`, {
    cf: { cacheTtl: 0 },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} (${param})`);
  }

  return response.json();
}

async function buildTemperaturePayload() {
  const [airPayload, surfacePayload] = await Promise.all([
    fetchParam(AIR_PARAM),
    fetchParam(SURFACE_PARAM),
  ]);

  const air = getPointValue(airPayload, NASA_DEFAULT_LOCATION);
  const surface = getPointValue(surfacePayload, NASA_DEFAULT_LOCATION);

  const fetchedAt = new Date();
  const nextAllowedRefreshAt = new Date(
    fetchedAt.getTime() + CACHE_TTL_SECONDS * 1000,
  );

  return {
    location: NASA_DEFAULT_LOCATION,
    metric: AIR_PARAM,
    temperature_c: air.value,
    surface_temperature_c: surface.value,
    grid_point: {
      lat: air.lat,
      lon: air.lon,
    },
    source_url: NASA_BASE_URL,
    fetched_at: formatIso(fetchedAt),
    next_allowed_refresh_at: formatIso(nextAllowedRefreshAt),
    cache_ttl_seconds: CACHE_TTL_SECONDS,
  };
}

function jsonResponse(payload, cacheStatus) {
  return new Response(JSON.stringify(payload), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${CACHE_TTL_SECONDS}`,
      "x-cache-status": cacheStatus,
    },
  });
}

export async function onRequestGet() {
  const cache = caches.default;
  const cacheKey = new Request("https://mars-temp-cache.local/api/temperature");

  const cached = await cache.match(cacheKey);
  if (cached) {
    const payload = await cached.json();
    return jsonResponse(payload, "HIT");
  }

  const payload = await buildTemperaturePayload();
  const response = jsonResponse(payload, "MISS");
  await cache.put(cacheKey, response.clone());
  return response;
}
