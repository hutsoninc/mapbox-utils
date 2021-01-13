export type MetersToMiles = (meters: number) => number

const metersToMiles: MetersToMiles = (meters) => {
  return meters / 1609.344;
};

export default metersToMiles;
