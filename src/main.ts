import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 3000;
  // Soporte para múltiples orígenes (separados por coma en el .env)
  const originsEnv = process.env.FRONTEND_URL || 'http://localhost:4200';
  const allowedOrigins = originsEnv.split(',').map(origin => origin.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Si no hay origen (ej. Postman o servidores), permitimos
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`🚫 CORS bloqueado para: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  await app.listen(port);
  console.log(`🚀 Backend corriendo en el puerto: ${port}`);
  console.log(`📡 Dominios permitidos: ${allowedOrigins.join(', ')}`);
}
bootstrap();
