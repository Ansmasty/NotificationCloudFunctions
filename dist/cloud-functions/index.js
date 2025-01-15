"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUnreadMessages = void 0;
const cloudfunctions_service_1 = require("./services/cloudfunctions.service");
const config_1 = require("@nestjs/config");
const email_service_1 = require("../utils/email.service");
const core_1 = require("@nestjs/core");
const cloudfunctions_module_1 = require("./cloudfunctions.module");
let cloudFunctionsService;
async function bootstrap() {
    const app = await core_1.NestFactory.createApplicationContext(cloudfunctions_module_1.CloudFunctionsModule);
    const configService = app.get(config_1.ConfigService);
    const emailService = app.get(email_service_1.EmailService);
    cloudFunctionsService = new cloudfunctions_service_1.CloudFunctionsService(configService, emailService);
}
bootstrap();
const checkUnreadMessages = (req, res) => {
    return cloudFunctionsService.checkUnreadMessages(req, res);
};
exports.checkUnreadMessages = checkUnreadMessages;
