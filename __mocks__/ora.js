// CommonJS stub for ora — used by @angular-devkit/schematics tasks in tests.
// The package manager task executor imports ora but tests never actually
// invoke package manager tasks, so a no-op spinner is sufficient.
'use strict';

function ora() {
  const spinner = {
    start() {
      return this;
    },
    stop() {
      return this;
    },
    succeed() {
      return this;
    },
    fail() {
      return this;
    },
    warn() {
      return this;
    },
    info() {
      return this;
    },
  };
  return spinner;
}

module.exports = ora;
module.exports.default = ora;
