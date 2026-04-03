import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 3000;
  // Soporte para múltiples orígenes, siempre incluimos localhost para desarrollo
  const originsEnv = process.env.FRONTEND_URL || '';
  const allowedOrigins = [
    ...originsEnv.split(',').map(o => o.trim()).filter(o => o),
    'https://admin.casaparrilla.com',
    'https://www.casaparrilla.com',
    'https://casaparrilla.com',
    'http://localhost:*',
    'http://127.0.0.1:*',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Si no hay origen (ej. Postman o servidores), permitimos
      if (!origin) return callback(null, true);

      // Verificamos si el origen coincide exactamente o con un comodín (ej. localhost:*)
      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed.includes('*')) {
          const prefix = allowed.split('*')[0];
          return origin.startsWith(prefix);
        }
        return allowed === origin;
      });

      if (isAllowed) {
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
