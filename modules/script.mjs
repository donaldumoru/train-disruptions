import { disruptionsData, stationsData } from './fetch.mjs';

const causesContainer = document.querySelector('.causes-container');

const controlsContainer = document.querySelector('.controls');

const colors = {
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
    const i = r.rdt_station_codes.indexOf(fromCode);
    const j = r.rdt_station_codes.indexOf(toCode);
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
      obj.color = colors[curr?.cause_group.split(' ').join('_')];

      acc.push(obj);
    }

    return acc;
  }, []);
};

// const obj = { name: 'Broken down train', value: 20, color: '#e02121' };

/**
 *
 *
 * @param {Object[]} causes - An array of disruptions data thats returned
 *  from 'getCauses' function to be visualized
 *
 */
const displayCauses = function (causes) {
  causesContainer.innerHTML = '';

  const root = d3.hierarchy({ children: causes }).sum(d => d.value);
  const pack = d3
    .pack()
    .size([800, 800]) // canvas size
    .padding(5);
  const nodes = pack(root).leaves();

  nodes.forEach(d => {
    const div = document.createElement('div');
    div.setAttribute('data-id', 'bubble');
    div.className = 'bubble';
    div.textContent = d.data.title;
    div.style.width = div.style.height = d.r * 2 + 'px'; // radius * 2
    div.style.left = d.x - d.r + 'px'; // position
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

const getCauses = function (e) {
  /// keep in mind that the THIS keyword has now been set to an array containing 'Disruptions' data and 'Stations' data
  const [disruptions, stations] = this; // Directly destructure the array here

  const departure = e.currentTarget.querySelector(
    '.departure-wrapper select'
  ).value;
  const arrival = e.currentTarget.querySelector(
    '.arrival-wrapper select'
  ).value;
  const year = e.currentTarget.querySelector('.year-wrapper select').value;

  const allDisruptions = Object.values(disruptions).flat();

  // const checkCheckCheck = allDisruptions.reduce((acc, curr) => {
  //   const group = curr?.cause_group;

  //   if (!acc[group]) {
  //     acc[group] = 0;
  //   }

  //   acc[group]++;
  //   return acc;
  // }, {});

  // console.log(checkCheckCheck);

  if (!departure || !arrival || !year) return;

  let allMatches;

  if (year === 'all') {
    allMatches = routesIncluding(allDisruptions, departure, arrival);
  } else {
    allMatches = routesIncluding(disruptions[year], departure, arrival);
  }

  const causesData = countCauses(allMatches);

  console.log(causesData);

  displayCauses(causesData);
};

const boundGetCauses = getCauses.bind([disruptionsData, stationsData]);

controlsContainer.addEventListener('click', e => {
  if (e.target.tagName === 'BUTTON') {
    boundGetCauses(e);
  }
});
