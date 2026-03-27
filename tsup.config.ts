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
