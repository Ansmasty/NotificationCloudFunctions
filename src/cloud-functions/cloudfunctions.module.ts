import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { EmailService } from '../utils/email.service';
import { CloudFunctionsService } from './services/cloudfunctions.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule, 
  ],
  providers: [CloudFunctionsService, EmailService],
  exports: [CloudFunctionsService, EmailService],
})
export class CloudFunctionsModule {}