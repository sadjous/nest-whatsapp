import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';
import type { Request, Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
  await app.listen(3000);
  console.log('Basic HTTP example running on http://localhost:3000');
}
bootstrap();
