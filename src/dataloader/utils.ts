/**
 * @param {Number[]|String[]} keys
 * @param {Number|String} key
 * @param {Object[]} values
 * @param {Boolean} aggregateInArray
 *
 * @returns {Object[]|Object[][]}
 *
 * examples:
 *  - resolveSQLResult(
 *      [1, 3, 2 ],
 *      'id',
 *      [
 *          { id: 1 },
 *          { id: 2 },
 *      ]
 *  )
 *  will return ->
 *  [
 *      { id: 1 },
 *      null,
 *      { id: 2 }
 *  ]
 *
 *
 *  - resolveSQLResult(
 *      [1, 3, 2 ],
 *      'id',
 *      [
 *          { id: 1 },
 *          { id: 2 },
 *          { id: 2 },
 *      ]
 *  )
 *  will return ->
 *  [
 *      [
 *          { id: 1 },
 *      ],
 *      null,
 *      [
 *          { id: 2 },
 *          { id: 2 },
 *      ],
 *  ]
 *
 */
export const resolveSQLResult = (keys: string[]|number[], key: string, values: object[], aggregateInArray?: boolean): Object[] | Object[][] => {
    const acc = {};

    for (const v of values) {
        if (!v[key]) {
            continue;
        }

        if (aggregateInArray) {
            !acc[v[key]]
                ? acc[v[key]] = [v]
                : acc[v[key]].push(v);
        } else acc[v[key]] = v;
    }

    return keys.map((v: string|number) => acc[v] || null);
}
