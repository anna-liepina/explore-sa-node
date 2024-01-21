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
    const unitCoefficient: number = rangeUnit === RangeUnit.ml ? 1.60934 : 1;

    const latDelta: number = (range / 111) * unitCoefficient;
    const lngDelta: number = (range / (111 * Math.cos(lat * (Math.PI / 180)))) * unitCoefficient;

    return {
        latitudeRange: [lat - latDelta, lat + latDelta],
        longitudeRange: [lng - lngDelta, lng + lngDelta],
    }
}
