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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudFunctionsService = void 0;
const common_1 = require("@nestjs/common");
const email_service_1 = require("../../utils/email.service");
const path = __importStar(require("path"));
const knex_1 = __importDefault(require("knex"));
const config_1 = require("@nestjs/config");
let CloudFunctionsService = class CloudFunctionsService {
    constructor(configService, emailService) {
        this.configService = configService;
        this.emailService = emailService;
        this.db = (0, knex_1.default)({
            client: "pg",
            connection: {
                host: this.configService.get("DB_HOST"),
                port: this.configService.get("DB_PORT"),
                database: this.configService.get("DB_NAME"),
                user: this.configService.get("DB_USER"),
                password: this.configService.get("DB_PASSWORD"),
                ssl: false,
            },
            pool: {
                min: 0,
                max: 7,
                idleTimeoutMillis: 30000,
                acquireTimeoutMillis: 60000,
                createTimeoutMillis: 30000,
                propagateCreateError: false,
            },
            debug: true,
        });
    }
    async validateDbConnection() {
        let retries = 3;
        while (retries > 0) {
            try {
                console.log(`Intento de conexión ${4 - retries}/3...`);
                const result = await this.db.raw("SELECT 1");
                console.log("Conexión exitosa:", result);
                return true;
            }
            catch (error) {
                console.error("Error en intento de conexión:", {
                    message: error.message,
                    retries: retries - 1,
                });
                retries--;
                if (retries > 0) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }
        }
        return false;
    }
    async checkUnreadMessages(req, res) {
        var _a;
        try {
            const isConnected = await this.validateDbConnection();
            if (!isConnected) {
                throw new Error("Error de conexión a la base de datos");
            }
            // 1. Obtener mensajes no leídos
            const unreadMessages = await this.db("messages_coach as m")
                .select("m.chat_id", "m.from", "m.to", "m.message as message_text", "m.sended_at as sent_at", "m.id as message_id", "m.type", "u.firstName as sender_name", "u.email as sender_email", "cc.coach_id", "cc.user_id")
                .join("user as u", "m.from", "u.id")
                .join("chat_coach as cc", "m.chat_id", "cc.id")
                .where({
                "m.read": false,
            })
                .andWhere("m.sended_at", "<", this.db.raw("NOW() - INTERVAL '1 hour'"))
                .whereNotExists(function () {
                this.select("*")
                    .from("message_notifications")
                    .whereRaw("message_id = m.id");
            })
                .orderBy("m.sended_at", "desc");
            if (!unreadMessages.length) {
                res.json({ message: "No hay mensajes sin leer que notificar" });
                return;
            }
            // 2. Agrupar mensajes por chat
            const messagesByChat = new Map();
            // 3. Obtener información de los coaches para cada chat
            for (const msg of unreadMessages) {
                if (!messagesByChat.has(msg.chat_id)) {
                    // Obtener información del coach
                    const coach = await this.db("user as u")
                        .select("u.id", "u.email", "u.firstName")
                        .where("u.id", msg.coach_id)
                        .first();
                    if (!(coach === null || coach === void 0 ? void 0 : coach.email))
                        continue;
                    messagesByChat.set(msg.chat_id, {
                        coach,
                        messages: [],
                    });
                }
                (_a = messagesByChat.get(msg.chat_id)) === null || _a === void 0 ? void 0 : _a.messages.push({
                    message_id: msg.message_id,
                    sender_name: msg.sender_name,
                    message_text: msg.message_text,
                    sent_at: msg.sent_at,
                    type: msg.type,
                });
            }
            // 4. Enviar notificaciones y registrar
            const emailTemplate = path.join(__dirname, "../../utils/email_templates/unread_messages.html");
            for (const [chatId, data] of messagesByChat) {
                // Enviar email al coach
                console.log(JSON.stringify(data));
                console.log(data);
                await this.emailService.sendEmail(data.coach.email, "Tienes mensajes sin leer en el chat", emailTemplate, {
                    coach_name: data.coach.firstName,
                    messages: JSON.stringify(data.messages.map((m) => ({
                        sender: m.sender_name,
                        text: m.message_text,
                        time: new Date(m.sent_at).toLocaleString(),
                        type: m.type,
                    })))
                });
                // Registrar notificaciones
                await this.db("message_notifications").insert(data.messages.map((m) => ({
                    message_id: m.message_id,
                    notified_at: new Date(),
                })));
            }
            res.json({
                success: true,
                message: `Notificaciones enviadas para ${messagesByChat.size} chats`,
            });
        }
        catch (error) {
            console.error("Error:", error);
            res.status(error.status || 500).json({
                error: "Error en el servicio",
                details: error instanceof Error ? error.message : "Error desconocido",
            });
        }
    }
};
CloudFunctionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        email_service_1.EmailService])
], CloudFunctionsService);
exports.CloudFunctionsService = CloudFunctionsService;
