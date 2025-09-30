// const body = document.querySelector('body');

// import { disruptionsData } from './fetch.mjs';

// const flattenedData = Object.entries(disruptionsData)
//   .flat()
//   .filter(el => {
//     if (typeof el !== 'string') return el;
//   })
//   .flat();

// const countCauses = flattenedData.reduce((acc, curr) => {
//   const cause = curr.cause_en;

//   if (!acc[cause]) {
//     acc[cause] = 0;
//   }

//   acc[cause]++;

//   return acc;
// }, {});

// const causesArr = Object.entries(countCauses);

// const numOfAllData = Object.entries(disruptionsData)
//   .flat()
//   .filter(el => typeof el !== 'string')
//   .flat()
//   .reduce((acc, _) => {
//     acc++;
//     return acc;
//   }, 0);

// // console.log("Total: ", numOfAllData);

// export { countCauses };

// export { routesIncluding, countCauses, displayBubbleCharts, makeRouteOnMap };
