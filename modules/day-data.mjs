import { disruptionsData } from './fetch.mjs';

const checkFrequency = function (timeArr) {
  const hours = timeArr.map(t => Number(t.split(':')[0]));

  // here we count the occurrences of each hour
  const counts = {};
  for (const h of hours) {
    counts[h] = (counts[h] || 0) + 1;
  }

  // here, find the hour with the highest count
  let mostCommonHour;
  let highestCount = 0;

  for (const [hour, count] of Object.entries(counts)) {
    if (count > highestCount) {
      highestCount = count;
      mostCommonHour = hour;
    }
  }

  return `${mostCommonHour}:00–${mostCommonHour}:59`;
};

// console.log(disruptionsData);
const displayDaysData = function (data) {
  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];

  const dayDataObj = data.reduce((acc, curr) => {
    const timeStarted = new Date(curr?.start_time);
    const dayStarted = days[timeStarted.getDay()];
    const timeEnded = new Date(curr.end_time);
    const diffInMs = timeEnded.getTime() - timeStarted.getTime();

    if (!acc[dayStarted]) {
      acc[dayStarted] = {};
      acc[dayStarted].disruptions = 1;
      acc[dayStarted].timePerDelay = [];
      acc[dayStarted].occurences = [];
      acc[dayStarted].highestOccurence = '';
      acc[dayStarted].averageTime = 0;
    } else {
      acc[dayStarted].disruptions++;
      acc[dayStarted].timePerDelay.push(diffInMs);
      acc[dayStarted].occurences.push(timeStarted.toTimeString().split(' ')[0]);
      acc[dayStarted].highestOccurence = checkFrequency(
        acc[dayStarted].occurences
      );
    }

    const averageTime =
      acc[dayStarted].timePerDelay.reduce((acc, curr) => (acc += curr), 0) /
      acc[dayStarted].timePerDelay.length;

    acc[dayStarted].averageTime = Math.round(averageTime / (1000 * 60));

    return acc;
  }, {});

  return dayDataObj;
};

const renderDaysData = function (obj) {
  const divOne = document.querySelector('.div1');
  const divTwo = document.querySelector('.div2');
  const divThree = document.querySelector('.div3');
  const divFour = document.querySelector('.div4');
  const divFive = document.querySelector('.div5');
  const divSix = document.querySelector('.div6-1');
  const divSeven = document.querySelector('.div6-2');

  const dataToDisplay = Object.entries(obj).sort(
    (a, b) => b[1].disruptions - a[1].disruptions
  );

  const allDivs = [
    divOne,
    divFive,
    divTwo,
    divThree,
    divFour,
    divSix,
    divSeven,
  ];

  const dayDetails = document.querySelectorAll('.day-details');

  dayDetails.forEach(d => (d.innerHTML = ''));

  for (let i = 0; i < allDivs.length; i++) {
    const dayTitle = allDivs[i].querySelector('.day-title');

    if (!dataToDisplay[i]) {
      continue;
    }

    dayTitle.textContent = dataToDisplay[i][0];

    const details = `<div class="day-details">
                <p><span>Disruptions: </span>${
                  dataToDisplay[i][1].disruptions
                } incidents</p>
                <p><span>Avg. Fix Time: </span>${
                  dataToDisplay[i][1].averageTime || 'No data'
                } mins</p>
                <p><span>Peak Hour: </span>${
                  dataToDisplay[i][1].highestOccurence || 'No data'
                } </p>
              </div>`;

    allDivs[i].insertAdjacentHTML('beforeend', details);

    dayTitle.textContent = dataToDisplay[i][0];
  }
};

export { displayDaysData, renderDaysData };
