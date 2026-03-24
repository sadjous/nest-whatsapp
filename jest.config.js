module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/examples', '<rootDir>/schematics'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/schematics/dist/'],
  coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/schematics/dist/'],
  moduleNameMapper: {
    '^ora$': '<rootDir>/__mocks__/ora.js',
  },
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: false, decorators: true },
          transform: { decoratorMetadata: true },
          target: 'es2022',
        },
        module: { type: 'commonjs' },
        sourceMaps: 'inline',
      },
    ],
  },
  coverageProvider: 'v8',
};
