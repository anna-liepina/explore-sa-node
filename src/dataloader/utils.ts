export const resolveSQLResult = (
    keysToMap: (string|number)[],
    indexKey: string,
    results: object[],
    asArray?: boolean
): Object[] | Object[][] => {
    const cache = {};

    for (const v of results) {
        if (!v[indexKey]) {
            continue;
        }

        const key = v[indexKey];
        if (!asArray) {
            cache[key] = v;
            continue;
        }

        cache[key] ||= [];
        cache[key].push(v);
    }

    return keysToMap.map((v) => cache[v] || null);
}
