import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupSwagger(app: INestApplication, globalPrefix: string) {
  const config = new DocumentBuilder()
    .setTitle('Boilerplate API')
    .setDescription('API documentation for Boilerplate Nest-Next application')
    .setVersion('1.0')
    .addTag('api')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document);
}
