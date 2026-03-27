import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    metrics: 'src/metrics.ts',
    health: 'src/health.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: false,
  treeshake: true,
  esbuildOptions(options) {
    // TypeScript interfaces have no runtime value; esbuild reports "missing-export"
    // for any `import { InterfaceName }` without `import type`. Silence the
    // diagnostic — the TS loader still strips them correctly from JS output.
    options.logOverride = { 'missing-export': 'silent' };
  },
  external: [
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/axios',
    '@nestjs/config',
    '@nestjs/event-emitter',
    '@nestjs/microservices',
    '@nestjs/terminus',
    'axios',
    'express',
    'joi',
    'prom-client',
    'reflect-metadata',
    'rxjs',
    'eventemitter2',
  ],
});
