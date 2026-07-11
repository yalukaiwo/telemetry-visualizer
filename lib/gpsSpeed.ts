import { IGpsData } from "./store/LogGpsStore";

export const SPEED_KEY = "Speed (km/h)";

const SMOOTHING_WINDOW = 5;

// Parses "UTC Time" in hhmmss(.sss) format to seconds since midnight
function utcTimeToSeconds(utcTime: string | number): number | null {
  const str = utcTime.toString();
  if (!/^\d{6}(\.\d+)?$/.test(str)) return null;

  const hours = Number(str.slice(0, 2));
  const minutes = Number(str.slice(2, 4));
  const seconds = Number(str.slice(4));

  return hours * 3600 + minutes * 60 + seconds;
}

// Distance in meters between two lat/long points
function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = Math.PI / 180;

  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

function movingAverage(values: number[], window: number): number[] {
  const half = Math.floor(window / 2);

  return values.map((_, i) => {
    const start = Math.max(0, i - half);
    const end = Math.min(values.length - 1, i + half);

    let sum = 0;
    for (let j = start; j <= end; j++) {
      sum += values[j];
    }

    return sum / (end - start + 1);
  });
}

// Adds a derived speed field calculated from lat/long and UTC time.
// Each point's speed is measured against the last point with a distinct
// timestamp, since GPS timestamps have 1-second resolution but the data
// is sampled multiple times per second.
export function addSpeedToGpsData(gpsData: IGpsData[]): IGpsData[] {
  const speeds: number[] = new Array(gpsData.length).fill(0);

  type GpsPoint = { lat: number; lon: number; time: number };
  let anchor: GpsPoint | null = null; // last point of the previous distinct second
  let prev: GpsPoint | null = null;

  gpsData.forEach((point, i) => {
    const lat = Number(point.Latitude);
    const lon = Number(point.Longitude);
    const time = utcTimeToSeconds(point["UTC Time"]);

    if (time === null || (lat === 0 && lon === 0)) return;

    if (prev !== null && time > prev.time) {
      anchor = prev;
    }

    if (anchor !== null && time > anchor.time) {
      speeds[i] =
        (haversineMeters(anchor.lat, anchor.lon, lat, lon) /
          (time - anchor.time)) *
        3.6;
    }

    prev = { lat, lon, time };
  });

  const smoothed = movingAverage(speeds, SMOOTHING_WINDOW);

  return gpsData.map((point, i) => ({
    ...point,
    [SPEED_KEY]: Math.round(smoothed[i] * 10) / 10,
  }));
}
