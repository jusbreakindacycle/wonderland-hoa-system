/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/__tests__/setup.ts'],
  testMatch: ['<rootDir>/__tests__/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // The first router test pays for compiling the whole route tree, which
  // comfortably exceeds Jest's 5s default on a cold cache.
  testTimeout: 60000,
  collectCoverage: false,
};
