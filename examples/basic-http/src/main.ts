import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  // Disable the built-in body parser so the custom one below (with rawBody capture) is the only one.
  const app = await NestFactory.create(AppModule);
  // Trust reverse proxy hops (e.g. tunnel) only when TRUST_PROXY_HOPS is explicitly set.
  // Leave unset when running locally without a proxy.
  if (process.env.TRUST_PROXY_HOPS) {
    app.getHttpAdapter().getInstance().set('trust proxy', Number(process.env.TRUST_PROXY_HOPS));
  }
  // Security: HTTP headers
  app.use(helmet());
  // Security: disable Express signature
  // (helmet's hidePoweredBy also disables this, keeping explicit here for clarity)
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  // CORS: allow typical methods; adjust origins as needed
  app.enableCors({ origin: true, methods: 'GET,HEAD,PUT,PATCH,POST,DELETE' });
  // Rate limit: apply a modest global limiter for example endpoints
  app.use(
    rateLimit({
      windowMs: 60_000, // 1 minute
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
  type RawBodyRequest = Request & { rawBody: Buffer };
  app.use(
    bodyParser.json({
      limit: '2mb',
      verify: (req: Request, _res: Response, buf: Buffer) => {
        (req as RawBodyRequest).rawBody = buf;
      },
    })
  );
  const DEFAULT_PORT = 3344;
  const envPort = process.env.PORT;
  const parsedPort = envPort !== undefined ? Number(envPort) : DEFAULT_PORT;
  const port =
    Number.isFinite(parsedPort) && parsedPort >= 1 && parsedPort <= 65535
      ? parsedPort
      : DEFAULT_PORT;
  await app.listen(port);
  console.log(`Basic HTTP example running on http://localhost:${port}`);
}
bootstrap();
