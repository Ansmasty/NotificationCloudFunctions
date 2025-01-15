import { ConfigService } from "@nestjs/config";
import { HttpService } from '@nestjs/axios';
import { Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import * as Handlebars from "handlebars";
import * as nodemailer from "nodemailer";
import { firstValueFrom } from "rxjs";

@Injectable()
export class EmailService {
  private readonly sender: { name: string; email: string };

  constructor(
    private configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.sender = {
      name: this.configService.get<string>('MAIL_FROM_NAME') || "no-reply",
      email: this.configService.get<string>('MAIL_FROM') || "ignacio.seco@agsbyte.cl",
    };

    // Registrar el helper de Handlebars
    Handlebars.registerHelper("JSONstringify", function (context) {
      return JSON.stringify(context);
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    template: string,
    variables: { [key: string]: any }
  ): Promise<void> {
    const html = this.renderTemplate(template, variables);

    const body = {
      sender: this.sender,
      to: [
        {
          name: to,
          email: to,
        },
      ],
      subject,
      htmlContent: html,
    };

    await firstValueFrom(
      this.httpService.post('https://api.sendinblue.com/v3/smtp/email', body, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.configService.get<string>('SMTP_API_KEY'),
        },
      }),
    );
  }

  private renderTemplate(
    template: string,
    variables: { [key: string]: any }
  ): string {
    const templateReaded = Handlebars.compile(
      readFileSync(template, { encoding: "utf-8" })
    );

    return templateReaded(variables);
  }
}
