import { ConfigService } from "@nestjs/config";
import { HttpService } from '@nestjs/axios';
import { Injectable } from "@nestjs/common";
import { readFileSync } from "fs";
import * as Handlebars from "handlebars";
import * as nodemailer from "nodemailer";
import { firstValueFrom } from "rxjs";

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    // Obtener las credenciales del ConfigService
    const apiKey = this.configService.get<string>('SMTP_API_KEY');
    const mailFrom = this.configService.get<string>('MAIL_FROM');

    this.transporter = nodemailer.createTransport({
      host: "smtp-relay.sendinblue.com",
      port: 587,
      auth: {
        user: apiKey, // Usar el email como usuario
        pass: apiKey // Usar la API key como contraseña
      },
      secure: false,
      debug: true, // Habilitar logs de debug
      logger: true, // Habilitar logger
      tls: {
        rejectUnauthorized: false
      }
    } as nodemailer.TransportOptions);

    // Verificar la conexión
    this.transporter.verify((error) => {
      if (error) {
        console.error('Error al verificar el transporter:', error);
      } else {
        console.log('Servidor SMTP listo');
      }
    });

    // Registrar el helper de Handlebars
    Handlebars.registerHelper("JSONstringify", function (context) {
      return JSON.stringify(context);
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    template: string,
    variables: { [key: string]: string }
  ): Promise<void> {
    const html = this.renderTemplate(template, variables);

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"${this.configService.get<string>('MAIL_FROM_NAME')}" <${this.configService.get<string>('MAIL_FROM')}>`,
      to,
      subject,
      html
    };

    await this.transporter.sendMail(mailOptions);
  }

  private renderTemplate(
    template: string,
    variables: { [key: string]: string }
  ): string {
    const templateReaded = Handlebars.compile(
      readFileSync(template, { encoding: "utf-8" })
    );

    return templateReaded(variables);
  }
}
