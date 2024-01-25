export type Range = [number, number];
export enum RangeUnit {
    ml = 'ml',
    km = 'km'
}

type CoordinateRanges = {
    latitudeRange: Range;
    longitudeRange: Range;
}

export const coordinateRanges = (
    lat: number,
    lng: number,
    range: number,
    rangeUnit?: RangeUnit
): CoordinateRanges => {
    const unitCoefficient: number = rangeUnit === RangeUnit.ml ? 1.60934 : 1;

    const latDelta: number = (range / 111) * unitCoefficient;
    const lngDelta: number = (range / (111 * Math.cos(lat * (Math.PI / 180)))) * unitCoefficient;

    return {
        latitudeRange: [lat - latDelta, lat + latDelta],
        longitudeRange: [lng - lngDelta, lng + lngDelta],
    };
};
