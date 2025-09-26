import { stationOptions, allDisruptions } from './station-coords.mjs';

/**
 *
 * @param {array} arr
 * takes in an array of train stations to render the departure and arrival options
 */
const renderDepartureAndArrival = function (arr) {
  const departureEl = document.querySelector('#departure');
  const arrivalEl = document.querySelector('#arrival');

  arr.forEach(station => {
    const departureOption = document.createElement('option');
    departureOption.value = station.code;
    departureOption.textContent = station?.name_long;

    departureEl.append(departureOption);

    const arrivalOption = document.createElement('option');
    arrivalOption.value = station.code;
    arrivalOption.textContent = station?.name_long;

    arrivalEl.append(arrivalOption);
  });
};

/**
 *
 * @param {array} arr
 * takes in an array of years to render filter by year option
 */
const renderYearOption = function (arr) {
  const yearEl = document.querySelector('#year');

  const allYears = document.createElement('option');
  allYears.value = 'all';
  allYears.textContent = `Since ${arr[0]}`;
  yearEl.append(allYears);

  arr.forEach(year => {
    const yearOption = document.createElement('option');
    yearOption.value = year;
    yearOption.setAttribute('data-id', year);
    yearOption.textContent = year;
    yearEl.append(yearOption);
  });
};

const MAKE_CONTROLS = function () {
  renderDepartureAndArrival(stationOptions);
  renderYearOption(allDisruptions.filter(d => typeof d === 'string'));
};

export { MAKE_CONTROLS };
