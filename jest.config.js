const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Mock all NextAuth related modules to avoid ESM issues
    "^next-auth$": "<rootDir>/__mocks__/next-auth.js",
    "^next-auth/next$": "<rootDir>/__mocks__/next-auth.js",
    "^next-auth/core$": "<rootDir>/__mocks__/next-auth.js",
    "^jose$": "<rootDir>/__mocks__/jose.js",
    "^openid-client$": "<rootDir>/__mocks__/openid-client.js",
    "^@panva/hkdf$": "<rootDir>/__mocks__/hkdf.js",
    "^oauth4webapi$": "<rootDir>/__mocks__/oauth4webapi.js",
  },
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/android/",
    "<rootDir>/ios/",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.{js,ts}",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  transformIgnorePatterns: [
    "node_modules/(?!(jose|openid-client|next-auth|@auth|@panva|oauth4webapi|preact-render-to-string|preact)/)",
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
