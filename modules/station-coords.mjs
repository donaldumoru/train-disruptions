import { disruptionsData, stationsData } from './fetch.mjs';

/// Filter to only get relevant stations in NL
const stationOptions = stationsData
  .filter(station => station.country === 'NL')
  .filter(
    station =>
      station.type === 'knooppuntIntercitystation' ||
      station.type === 'megastation' ||
      station.type === 'intercitystation'
  );

const map = L.map('map').setView([52.1, 5.3], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap',
}).addTo(map);

const stationsCoords = stationOptions.reduce((acc, curr) => {
  if (!acc[curr.code]) {
    acc[curr.code] = [];
  }
  acc[curr.code].push(curr.geo_lat, curr.geo_lng);
  return acc;
}, {});

const stationCodes = Object.keys(stationsCoords);

const allDisruptions = Object.entries(disruptionsData).flat();

const MAKE_MAP = function () {
  const NL_BOUNDS = L.latLngBounds([50.75, 3.2], [53.5, 7.22]);

  map.setMaxBounds(NL_BOUNDS);
  map.setMinZoom(map.getBoundsZoom(NL_BOUNDS));
  map.fitBounds(NL_BOUNDS, { padding: [20, 20] });

  /***************************************************************/
  const inNL = ([lat, lng]) =>
    lat >= NL_BOUNDS.getSouth() &&
    lat <= NL_BOUNDS.getNorth() &&
    lng >= NL_BOUNDS.getWest() &&
    lng <= NL_BOUNDS.getEast();

  const layers = [];

  allDisruptions
    .filter(el => typeof el !== 'string')
    .flat()
    .forEach(disruption => {
      const codes = disruption?.rdt_station_codes
        .split(',')
        .map(c => c.trim())
        .filter(code => stationCodes.includes(code));

      if (codes.length > 1) {
        const route = codes.map(code => stationsCoords[code]);

        if (!inNL(route[0]) || !inNL(route[1])) return;

        const layer = L.polyline(route, {
          color: '#0ea5e9',
          weight: 0,
        }).addTo(map);

        layers.push(layer);
      }
    });

  if (layers.length) {
    const group = L.featureGroup(layers).addTo(map);
    map.fitBounds(group.getBounds(), { padding: [20, 20] });
  }
  /***************************************************************/
};

export { MAKE_MAP, stationOptions, allDisruptions };
