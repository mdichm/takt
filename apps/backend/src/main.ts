import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validation des entrées externes : schémas Zod partagés (@takt/contracts)
  // appliqués route par route via ZodValidationPipe (GG-05 — pas de class-validator).

  // OpenAPI (GG-02 : comparaison avec docs/openapi.yaml en CI)
  const config = new DocumentBuilder()
    .setTitle('TAKT API')
    .setDescription('API de planification et gestion des emplois du temps pédagogiques')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();