declare module "tz-lookup" {
  const lookup: (lat: number, lon: number) => string;
  export default lookup;
}
