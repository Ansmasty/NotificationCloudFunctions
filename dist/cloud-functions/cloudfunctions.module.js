"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudFunctionsModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const email_service_1 = require("../utils/email.service");
const cloudfunctions_service_1 = require("./services/cloudfunctions.service");
let CloudFunctionsModule = class CloudFunctionsModule {
};
CloudFunctionsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            axios_1.HttpModule,
        ],
        providers: [cloudfunctions_service_1.CloudFunctionsService, email_service_1.EmailService],
        exports: [cloudfunctions_service_1.CloudFunctionsService, email_service_1.EmailService],
    })
], CloudFunctionsModule);
exports.CloudFunctionsModule = CloudFunctionsModule;
