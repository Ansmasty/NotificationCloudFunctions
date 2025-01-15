import { CloudFunctionsService } from './services/cloudfunctions.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../utils/email.service';
import { Request, Response } from 'express';
import { NestFactory } from '@nestjs/core';
import { CloudFunctionsModule } from './cloudfunctions.module';

let cloudFunctionsService: CloudFunctionsService;

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(CloudFunctionsModule);
  const configService = app.get(ConfigService);
  const emailService = app.get(EmailService);
  cloudFunctionsService = new CloudFunctionsService(configService, emailService);
}

bootstrap();

export const checkUnreadMessages = (req: Request, res: Response) => {
  return cloudFunctionsService.checkUnreadMessages(req, res);
};