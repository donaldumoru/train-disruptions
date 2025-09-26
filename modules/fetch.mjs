const disruptionsDataFile = './data/rijdendetreinen.json';
const stationsDataFile = './data/stations.json';

async function getData(disruptions, stations) {
  try {
    const [disruptionsResponse, stationsResponse] = await Promise.all([
      fetch(disruptions),
      fetch(stations),
    ]);

    if (!disruptionsResponse.ok || !stationsResponse.ok) {
      throw new Error(
        `Response status: ${disruptionsResponse.status} & ${stationsResponse.status}`
      );
    }

    const result = {
      disruptionsData: await disruptionsResponse.json(),
      stationsData: await stationsResponse.json(),
    };

    return result;
  } catch (error) {
    console.error(error.message);
  }
}

const { disruptionsData, stationsData } = await getData(
  disruptionsDataFile,
  stationsDataFile
);

export { disruptionsData, stationsData };
