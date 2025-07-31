module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/examples'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: { branches: 90, functions: 90, lines: 90, statements: 90 }
  }
};
