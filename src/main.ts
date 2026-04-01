import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 3000;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';

  app.enableCors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  await app.listen(port);
  console.log(`🚀 Backend corriendo en el puerto: ${port}`);
  console.log(`📡 CORS activo para: ${frontendUrl}`);
}
bootstrap();
