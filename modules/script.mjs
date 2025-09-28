import { disruptionsData } from './fetch.mjs';
import { map, stationOptions } from './station-coords.mjs';

const causesContainer = document.querySelector('.causes-container');

const controlsContainer = document.querySelector('.controls');

const causesColors = {
  others: '#1395FF',
  accidents: '#E8870F',
  engineering_work: '#B23B63',
  external: '#E407BC',
  infrastructure: '#3185D4',
  logistical: '#4CA70F',
  rolling_stock: '#E31A1A',
  staff: '#29E2BD',
  unknown: '#0D5C76',
  weather: '#2E0D76',
};

/**
 * Filters all routes in `routeList` to find those that include both a
 * starting station and a destination station, in the correct order.
 *
 * @param {string} fromCode - The station code of the starting point.
 * @param {string} toCode - The station code of the destination point.
 * @returns {Object[]} An array of all disruptions that pass the filter criteria.
 *
 */
const routesIncluding = function (disruptions, fromCode, toCode) {
  return disruptions.filter(r => {
    const codes = r?.rdt_station_codes.split(',').map(c => c.trim());

    const i = codes.indexOf(fromCode);
    const j = codes.indexOf(toCode);
    return i !== -1 && j !== -1 && i < j;
  });
};

// /**
//  * Counts the occurrence of each disruption cause and sets value per cause
//  *
//  * @param {Object[]} array - array of all disruptions thats returned
//  * from 'getCauses' functions
//  * @returns {Object[]} An array containing objects of each cause and value
//  *
//  */

const countCauses = function (disruptions) {
  return disruptions.reduce((acc, curr) => {
    const cause = curr?.cause_en;

    if (acc.some(el => el.title === cause)) {
      const elToUpdate = acc.find(el => el.title === cause);
      elToUpdate.value++;
    } else {
      const obj = {};
      obj.title = cause;
      obj.value = 1;
      obj.color = causesColors[curr?.cause_group.split(' ').join('_')];

      acc.push(obj);
    }

    return acc;
  }, []);
};

/**
 * Renders a packed bubble chart of disruption causes using D3's hierarchy and pack layout.
 *
 * Each cause is represented as a div element and size is determined by the num value of the cause
 * and labeled by its `title`.
 *
 * @param {Object[]} array of causes
 *   An array of cause objects:
 *     - `title`: The label shown inside the bubble.
 *     - `value`: The numeric weight determining bubble size.
 *     - `color`: The background color to be used for the background which is derived
 *                from the 'colors' object *
 */
const displayCauses = function (causes) {
  const root = d3.hierarchy({ children: causes }).sum(d => d.value);
  const pack = d3.pack().size([800, 800]).padding(5);
  const nodes = pack(root).leaves();

  nodes.forEach(d => {
    const div = document.createElement('div');
    div.setAttribute('data-id', 'bubble');
    div.className = 'bubble';
    div.textContent = d.data.title;
    div.style.width = div.style.height = d.r * 2 + 'px';
    div.style.left = d.x - d.r + 'px';
    div.style.top = d.y - d.r + 'px';
    div.style.position = 'absolute';
    div.style.borderRadius = '50%';
    div.style.background = d.data.color;
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.color = 'white';
    div.style.fontSize = '10px';
    document.body.appendChild(div);

    causesContainer.append(div);
  });
};

const makeRouteOnMap = function (disruptions, stations, departure, arrival) {
  const allStations = disruptions.map(d => d?.rdt_station_codes.split(', '));

  const departureData = stations.find(station => station.code === departure);
  const arrivalData = stations.find(station => station.code === arrival);

  function wavyRoute(
    from,
    to,
    { waves = 3, amplitude = 0.03, samples = 180 } = {}
  ) {
    const [lat1, lng1] = from;
    const [lat2, lng2] = to;

    const lat0 = (((lat1 + lat2) / 2) * Math.PI) / 180;
    const cos0 = Math.cos(lat0);

    const x1 = lng1 * cos0,
      y1 = lat1;
    const x2 = lng2 * cos0,
      y2 = lat2;

    const dx = x2 - x1,
      dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len,
      uy = dy / len;
    const nx = -uy,
      ny = ux;

    const A = amplitude * len;

    const pts = [];
    for (let k = 0; k <= samples; k++) {
      const t = k / samples;
      const sx = x1 + t * dx;
      const sy = y1 + t * dy;

      const taper = Math.sin(Math.PI * t);
      const wobble = Math.sin(2 * Math.PI * waves * t) * taper;

      const wx = sx + nx * (A * wobble);
      const wy = sy + ny * (A * wobble);

      pts.push([wy, wx / cos0]);
    }
    return pts;
  }

  const from = [departureData.geo_lat, departureData.geo_lng];
  const to = [arrivalData.geo_lat, arrivalData.geo_lng];

  const latlngs = wavyRoute(from, to, {
    waves: 4,
    amplitude: 0.025,
    samples: 220,
  });

  if (window.currentRoute) map.removeLayer(window.currentRoute);
  window.currentRoute = L.polyline(latlngs, {
    color: '#0ea5e9',
    weight: 8,
    opacity: 0.95,
  }).addTo(map);

  map.fitBounds(window.currentRoute.getBounds().pad(0.1));
};

const getCauses = function (e) {
  /// keep in mind------->>>>>that the THIS keyword has now been set to an array containing 'Disruptions' data and 'Stations' data
  const [disruptions, stations] = this; // Directly destructure the array here

  console.log(stations);

  const departure = e.currentTarget.querySelector(
    '.departure-wrapper select'
  ).value;

  const arrival = e.currentTarget.querySelector(
    '.arrival-wrapper select'
  ).value;

  const year = e.currentTarget.querySelector('.year-wrapper select').value;

  const allDisruptions = Object.values(disruptions).flat();

  if (!departure || !arrival || !year) return;

  let allMatches;

  if (year === 'all') {
    allMatches = routesIncluding(allDisruptions, departure, arrival);
  } else {
    allMatches = routesIncluding(disruptions[year], departure, arrival);
  }

  causesContainer.innerHTML = '';

  makeRouteOnMap(allMatches, stations, departure, arrival);

  if (allMatches.length > 0) {
    const causesData = countCauses(allMatches);

    displayCauses(causesData);
  }
};

const boundGetCauses = getCauses.bind([disruptionsData, stationOptions]);

controlsContainer.addEventListener('click', e => {
  if (e.target.tagName === 'BUTTON') {
    boundGetCauses(e);
  }
});

//
