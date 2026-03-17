module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // semantic-release generates commit bodies with changelog lines that exceed 100 chars
    'body-max-line-length': [0],
  },
};
