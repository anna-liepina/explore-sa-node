import {
    coordinatesWithinRange,
    CoordinateRange,
    RangeUnit,
} from "./utils";

describe("coordinatesWithinRange", () => {
    test.each`
            lat    | lng    | range  | rangeUnit       | expectedLatitudeRange                        | expectedLongitudeRange
            ${0}   | ${0}   | ${100} | ${undefined}    | ${[-0.9009009009009009, 0.9009009009009009]} | ${[-0.9009009009009009, 0.9009009009009009]}
            ${0}   | ${0}   | ${100} | ${RangeUnit.ml} | ${[-0.5594788640173755, 0.5594788640173755]} | ${[-0.5594788640173755, 0.5594788640173755]}
            ${-45} | ${-90} | ${50}  | ${RangeUnit.ml} | ${[-45.27963476146274, -44.72036523853726]}  | ${[-90.27963476146274, -89.72036523853726]}
    `(
        "calculates coordinate ranges",
        ({
            lat,
            lng,
            range,
            rangeUnit,
            expectedLatitudeRange,
            expectedLongitudeRange,
        }) => {
            const result: CoordinateRange = coordinatesWithinRange(
                lat,
                lng,
                range,
                rangeUnit
            );

            expect(result.latitudeRange).toEqual(expectedLatitudeRange);
            expect(result.longitudeRange).toEqual(expectedLongitudeRange);
        }
    );
});
