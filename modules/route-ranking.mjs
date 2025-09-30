import { stationsData } from './fetch.mjs';
import { stationOptions } from './station-coords.mjs';

// Split and clean the codes string
const parseCodes = str =>
  (str || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

/**
 * From an ordered list like ["AMS","UTR","RTD"], make all directed pairs i<j:
 * AMS→UTR, AMS→RTD, UTR→RTD.
 */
const makeDirectedPairs = codes => {
  const pairs = new Set();
  for (let i = 0; i < codes.length; i++) {
    for (let j = i + 1; j < codes.length; j++) {
      if (codes[i] && codes[j] && codes[i] !== codes[j]) {
        pairs.add(`${codes[i]}|${codes[j]}`);
      }
    }
  }
  return pairs;
};

// Get disruptions array for a period ('all' or a year key)
const getDisruptionsForPeriod = (disruptionsByYear, period = 'all') =>
  period === 'all'
    ? Object.values(disruptionsByYear).flat()
    : disruptionsByYear?.[period] ?? [];

/**
 * Build a Set of all unique directed routes "FROM|TO" seen in the period.
 * Example return: Set { "AMS|RTD", "AMS|UTR", "UTR|RTD", ... }
 */
const getAllRoutes = (disruptionsByYear, period = 'all') => {
  const routes = new Set();
  const list = getDisruptionsForPeriod(disruptionsByYear, period);

  for (const r of list) {
    const codes = parseCodes(r?.rdt_station_codes);
    if (!codes.length) continue;

    // Dedup pairs within a single disruption before adding globally
    const pairs = makeDirectedPairs(codes);
    for (const key of pairs) routes.add(key);
  }
  return routes;
};

// const getAllRoutesArray = (disruptionsByYear, period = 'all') => {
//   const set = getAllRoutes(disruptionsByYear, period);
//   return [...set].map(k => {
//     const [from, to] = k.split('|');
//     return { from, to };
//   });
// };

const getAllRoutesArray = (
  disruptionsByYear,
  period = 'all',
  allowedStations = stationOptions
) => {
  const allowedCodes = new Set(
    (allowedStations || []).map(s => s.code).filter(Boolean)
  );

  // Get all unique directed routes FROM|TO from the disruptions
  const set = getAllRoutes(disruptionsByYear, period);

  // Keep only routes where both ends are in allowedCodes
  const routes = [];
  for (const k of set) {
    const [from, to] = k.split('|');
    if (allowedCodes.has(from) && allowedCodes.has(to)) {
      routes.push({ from, to });
    }
  }
  return routes;
};

export { parseCodes, getAllRoutes, getAllRoutesArray };

// Usage:
// const routesSet = getAllRoutes(disruptionsData, '2024'); // Set of "FROM|TO"
// const routesArr = getAllRoutesArray(disruptionsData, 'all'); // [{from:'AMS', to:'RTD'}, ...]
