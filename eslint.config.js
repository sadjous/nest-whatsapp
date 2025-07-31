module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', '@nestjs'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@nestjs/eslint-plugin',
    'prettier'
  ],
  env: { node: true, jest: true },
  ignorePatterns: ['dist/', 'node_modules/'],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off'
  }
};
