import { disruptionsData } from './fetch.mjs';
import { map, stationOptions } from './station-coords.mjs';

const rankingContainer = document.querySelector('.rank-container');

import {
  parseCodes,
  getAllRoutes,
  getAllRoutesArray,
} from './route-ranking.mjs';

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
 * @param {string} toCode - The station code of the arrival point.
 * @returns {Object[]} An array of all disruptions that pass the filter criteria.
 *
 */
const routesIncluding = function (disruptions, fromCode, toCode) {
  // Filter to get array of the disruptions where starting station comes before arrival station
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
const displayBubbleCharts = function (causes) {
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
  // const allStations = disruptions.map(d => d?.rdt_station_codes.split(', '));

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

const routeRanking = function (disruptions, stations, period = 'all') {
  // Build array of all possible routes
  const routesArr = getAllRoutesArray(disruptionsData, period, stationOptions);

  // Flatten disruptions for the selected period
  const list =
    period === 'all'
      ? Object.values(disruptions).flat()
      : disruptions[period] || [];

  // Parse station codes for each disruption
  const stationCodes = list.map(d => parseCodes(d.rdt_station_codes));

  const counts = new Map();

  for (const codes of stationCodes) {
    if (!codes || codes.length < 2) continue;

    const seen = new Set();

    for (let i = 0; i < codes.length; i++) {
      const from = codes[i];
      for (let j = i + 1; j < codes.length; j++) {
        const to = codes[j];
        if (from === to) continue;

        const key = `${from}|${to}`;
        if (seen.has(key)) continue;

        seen.add(key);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
  }

  const results = routesArr.map(({ from, to }) => {
    const key = `${from}|${to}`;
    return { from, to, user: false, disruptionValue: counts.get(key) || 0 };
  });

  return results;
};

const displayRankings = function (rankings, userRank, period) {
  rankingContainer.innerHTML = '';

  const rankHeader = document.createElement('p');
  rankHeader.className = 'rank-header';

  const showYear = period === 'all' ? 'Since 2021' : period;

  rankHeader.textContent = `Where your route ranks - ${showYear}`;

  rankingContainer.append(rankHeader);

  const indexOfUserRank = rankings.indexOf(userRank);

  const ranksToDisplay = rankings.slice(
    indexOfUserRank - 5,
    indexOfUserRank + 10
  );

  const maxDisruptions = ranksToDisplay[0]?.disruptionValue || 1;
  const MAX_PX = 400;
  const MIN_PX = 60;

  ranksToDisplay.forEach(({ from, to, disruptionValue, user, rank }) => {
    const width = Math.max(
      MIN_PX,
      Math.round((disruptionValue / maxDisruptions) * MAX_PX)
    );

    const fromTo = `${from} - ${to}`;

    const textWrapper = document.createElement('div');
    textWrapper.className = 'text-wrapper';

    const rankDisplay = document.createElement('span');
    rankDisplay.textContent = `${rank + 1}.`;
    const fromToDisplay = document.createElement('span');
    fromToDisplay.textContent = `${fromTo}`;

    textWrapper.append(rankDisplay, fromToDisplay);

    const rankWrapper = document.createElement('div');
    rankWrapper.className = 'rank-wrapper';

    if (user) {
      rankWrapper.classList.add('show-user-route');
    }

    const trainContainer = document.createElement('div');
    trainContainer.className = 'train-container';

    const train = document.createElement('div');
    train.className = 'train';
    train.style.width = `${width}px`;

    trainContainer.append(train);

    // Windows: fit as many as width allows
    const WINDOW_W = 15; // px

    const count = width / WINDOW_W / 2;

    for (let i = 0; i < count; i++) {
      const window = document.createElement('div');
      window.className = 'window';
      train.appendChild(window);
    }

    const disruptionCount = document.createElement('span');
    disruptionCount.className = 'disruption-count';
    disruptionCount.textContent = `${disruptionValue} disruptions`;
    trainContainer.append(disruptionCount);

    rankWrapper.append(textWrapper, trainContainer);

    rankingContainer.append(rankWrapper);
  });
};

const getCauses = function (e) {
  /// keep in mind------->>>>>that the THIS keyword has now been set to an array containing 'Disruptions' data and 'Stations' data
  const [disruptions, stations] = this; // Directly destructure the array here

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

    let userRanking = {
      from: departure,
      to: arrival,
      user: true,
      disruptionValue: causesData.reduce((acc, curr) => (acc += curr.value), 0),
    };

    const allDisruptionsRankings = routeRanking(disruptionsData, year);

    if (
      allDisruptionsRankings.some(
        d => d.from === userRanking.from && d.to === userRanking.to
      )
    ) {
      const foundRoute = allDisruptionsRankings.find(
        d => d.from === userRanking.from && d.to === userRanking.to
      );

      const indexOfFoundRoute = allDisruptionsRankings.indexOf(foundRoute);
      allDisruptionsRankings[indexOfFoundRoute] = userRanking;
    } else {
      allDisruptionsRankings.push(userRanking);
    }

    // allDisruptionsRankings.push(userRanking);

    const sortedResults = allDisruptionsRankings
      .sort((a, b) => b.disruptionValue - a.disruptionValue)
      .reduce((acc, curr, index) => {
        if (curr.rank) {
          curr.rank = index;
        }

        curr.rank = index;
        acc.push(curr);

        return acc;
      }, []);

    console.log(year);
    displayRankings(sortedResults, userRanking, year);

    displayBubbleCharts(causesData);
  }
};

const boundGetCauses = getCauses.bind([disruptionsData, stationOptions]);

controlsContainer.addEventListener('click', e => {
  if (e.target.tagName === 'BUTTON') {
    boundGetCauses(e);
  }
});
