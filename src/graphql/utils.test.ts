import {
    coordinatesWithinRange,
    CoordinateRange,
    RangeUnit,
} from "./utils";

describe("coordinatesWithinRange", () => {
    test.each`
        lat    | lng    | range  | rangeUnit       | expectedLatitudeRange                         | expectedLongitudeRange
        ${0}   | ${0}   | ${100} | ${undefined}    | ${[-0.9009009009009009, 0.9009009009009009]}  | ${[-0.9009009009009009, 0.9009009009009009]}
        ${0}   | ${0}   | ${100} | ${RangeUnit.km} | ${[-0.9009009009009009, 0.9009009009009009]}  | ${[-0.9009009009009009, 0.9009009009009009]}
        ${-45} | ${-90} | ${50}  | ${RangeUnit.km} | ${[-45.450450450450454, -44.549549549549546]} | ${[-90.45045045045045, -89.54954954954955]}
        ${0}   | ${0}   | ${100} | ${RangeUnit.ml} | ${[-1.4498558558558559, 1.4498558558558559]}  | ${[-1.4498558558558559, 1.4498558558558559]}
        ${-45} | ${-90} | ${50}  | ${RangeUnit.ml} | ${[-45.72492792792793, -44.27507207207207]}   | ${[-90.72492792792792, -89.27507207207208]}
    `(
        "calculates coordinate ranges [ range: $range rangeUnit: \"$rangeUnit\" ]",
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
