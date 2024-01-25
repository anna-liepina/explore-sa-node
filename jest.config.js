module.exports = {
    collectCoverageFrom: ["src/*/**.ts", "!src/**?(/*)index.ts?(x)"],
    globalSetup: "<rootDir>/sandbox/jest.global.setup.ts",
    setupFilesAfterEnv: ["<rootDir>/sandbox/jest.after.env.ts"],
    preset: "ts-jest",
    testEnvironment: "node",
    verbose: true,
    testMatch: ["**/?(*.)+(spec|test).+(ts)"],
    moduleFileExtensions: ["ts", "js", "json", "node"],
};
