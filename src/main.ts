import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // ignora props que no estén en el DTO
      forbidNonWhitelisted: true,   // rechaza si llegan props de más
      transform: true               // convierte el payload a la clase del DTO
    }) 
  )
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
