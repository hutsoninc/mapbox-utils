export type IsDefined = (val: any) => boolean

const isDefined: IsDefined = (val) => {
  return typeof val !== undefined && val !== null;
};

export default isDefined;
