"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const config_1 = require("@nestjs/config");
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const Handlebars = __importStar(require("handlebars"));
const nodemailer = __importStar(require("nodemailer"));
let EmailService = class EmailService {
    constructor(configService) {
        this.configService = configService;
        // Obtener las credenciales del ConfigService
        const apiKey = this.configService.get('SMTP_API_KEY');
        const mailFrom = this.configService.get('MAIL_FROM');
        this.transporter = nodemailer.createTransport({
            host: "smtp-relay.sendinblue.com",
            port: 587,
            auth: {
                user: apiKey,
                pass: apiKey // Usar la API key como contraseña
            },
            secure: false,
            debug: true,
            logger: true,
            tls: {
                rejectUnauthorized: false
            }
        });
        // Verificar la conexión
        this.transporter.verify((error) => {
            if (error) {
                console.error('Error al verificar el transporter:', error);
            }
            else {
                console.log('Servidor SMTP listo');
            }
        });
        // Registrar el helper de Handlebars
        Handlebars.registerHelper("JSONstringify", function (context) {
            return JSON.stringify(context);
        });
    }
    async sendEmail(to, subject, template, variables) {
        const html = this.renderTemplate(template, variables);
        const mailOptions = {
            from: `"${this.configService.get('MAIL_FROM_NAME')}" <${this.configService.get('MAIL_FROM')}>`,
            to,
            subject,
            html
        };
        await this.transporter.sendMail(mailOptions);
    }
    renderTemplate(template, variables) {
        const templateReaded = Handlebars.compile((0, fs_1.readFileSync)(template, { encoding: "utf-8" }));
        return templateReaded(variables);
    }
};
EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
exports.EmailService = EmailService;
