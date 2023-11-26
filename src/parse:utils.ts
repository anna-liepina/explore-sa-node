import fs from "fs";
import { PerformanceObserver } from "perf_hooks";
import type { ORM } from "./orm.types";

export enum MigrationsDirection {
    up = "up",
    down = "down",
}
export enum OperationMarker {
    properties = "parse:properties",
    postcodes = "parse:postcodes",
    timeline = "parse:timeline",
    incidents = "parse:incidents",
}

export const composeOperation =
    (operationMarker: OperationMarker, orm: ORM) =>
        async (direction: MigrationsDirection) => {
            const executeFiles = async (path: string) => {
            const files = fs.readdirSync(path);
            for (const file of files) {
                const obj = require(require.resolve(`${path}/${file}`));

                if (!obj[operationMarker]) {
                    continue;
                }

                await obj[direction](orm.sequelize.getQueryInterface(), orm.Sequelize);
            }
            };

            return executeFiles(`${__dirname}/../database/migrations`);
        };

export const perfObserver = () =>
  new PerformanceObserver((items) => {
        items.getEntries().forEach((o) => {
            console.log(`
PERFORMANCE OBSERVER METRICS
duration: ${(o.duration / 1000).toFixed(2)}s      
heapsize: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
            }
        );
  });
