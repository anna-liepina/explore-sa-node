export type Range = [number, number];
export enum RangeUnit {
    ml = 'ml',
    km = 'km'
}

export type CoordinateRange = {
    latitudeRange: Range;
    longitudeRange: Range;
}

export const coordinatesWithinRange = (
    lat: number,
    lng: number,
    range: number,
    rangeUnit?: RangeUnit
): CoordinateRange => {
    const coefficient: number = rangeUnit === RangeUnit.ml ? 1.60934 : 1;
    const delta: number = range / 111 * coefficient;

    return {
        latitudeRange: [lat - delta, lat + delta],
        longitudeRange: [lng - delta, lng + delta],
    };
};
