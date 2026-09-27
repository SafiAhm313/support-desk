import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/http-exception.filter';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://support-desk-client-iota.vercel.app',
];

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet());
  app.disable('x-powered-by');
  app.use(json({ limit: '100kb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({ origin: ALLOWED_ORIGINS });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
