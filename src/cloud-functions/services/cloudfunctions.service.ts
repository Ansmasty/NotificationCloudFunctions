import { Injectable } from "@nestjs/common";
import { EmailService } from "../../utils/email.service";
import * as path from "path";
import knex, { Knex } from "knex";
import { ConfigService } from "@nestjs/config";
import {
  UnreadMessage,
  CustomError,
  ServiceError,
} from "../interfaces/cloudfunctions.interface";
import { Request, Response } from "express";

@Injectable()
export class CloudFunctionsService {
  private db: Knex;

  constructor(
    private configService: ConfigService,
    private emailService: EmailService
  ) {
    this.db = knex({
      client: "pg",
      connection: {
        host: this.configService.get<string>("DB_HOST"),
        port: this.configService.get<number>("DB_PORT"),
        database: this.configService.get<string>("DB_NAME"),
        user: this.configService.get<string>("DB_USER"),
        password: this.configService.get<string>("DB_PASSWORD"),
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
      } catch (error) {
        console.error("Error en intento de conexión:", {
          message: (error as Error).message,
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

  async checkUnreadMessages(req: Request, res: Response): Promise<void> {
    try {
      const isConnected = await this.validateDbConnection();
      if (!isConnected) {
        throw new Error("Error de conexión a la base de datos");
      }

      // 1. Obtener mensajes no leídos
      const unreadMessages = await this.db("messages_coach as m")
        .select(
          "m.chat_id",
          "m.from",
          "m.to",
          "m.message as message_text",
          "m.sended_at as sent_at",
          "m.id as message_id",
          "m.type",
          "u.firstName as sender_name",
          "u.email as sender_email",
          "cc.coach_id",
          "cc.user_id"
        )
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
      const messagesByChat = new Map<
        string,
        {
          coach: { id: string; email: string; firstName: string };
          messages: UnreadMessage[];
        }
      >();

      // 3. Obtener información de los coaches para cada chat
      for (const msg of unreadMessages) {
        if (!messagesByChat.has(msg.chat_id)) {
          // Obtener información del coach
          const coach = await this.db("user as u")
            .select("u.id", "u.email", "u.firstName")
            .where("u.id", msg.coach_id)
            .first();

          if (!coach?.email) continue;

          messagesByChat.set(msg.chat_id, {
            coach,
            messages: [],
          });
        }

        messagesByChat.get(msg.chat_id)?.messages.push({
          message_id: msg.message_id,
          sender_name: msg.sender_name,
          message_text: msg.message_text,
          sent_at: msg.sent_at,
          type: msg.type,
        });
      }

      // 4. Enviar notificaciones y registrar
      const emailTemplate = path.join(
        __dirname,
        "../../utils/email_templates/unread_messages.html"
      );

      for (const [chatId, data] of messagesByChat) {
        // Enviar email al coach
        await this.emailService.sendEmail(
          data.coach.email,
          "Tienes mensajes sin leer en el chat",
          emailTemplate,
          {
            coach_name: data.coach.firstName,
            messages: JSON.stringify(data.messages.map((m) => ({
              sender: m.sender_name,
              text: m.message_text,
              time: new Date(m.sent_at).toLocaleString(),
              type: m.type,
            })))
          }
        );

        // Registrar notificaciones
        await this.db("message_notifications").insert(
          data.messages.map((m) => ({
            message_id: m.message_id,
            notified_at: new Date(),
          }))
        );
      }

      res.json({
        success: true,
        message: `Notificaciones enviadas para ${messagesByChat.size} chats`,
      });
    } catch (error) {
      console.error("Error:", error);
      res.status((error as ServiceError).status || 500).json({
        error: "Error en el servicio",
        details: error instanceof Error ? error.message : "Error desconocido",
      });
    }
  }
}
