"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    PORT: zod_1.z.coerce.number().default(5000),
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
    FRONTEND_URL: zod_1.z.string().default("http://localhost:3000"),
    SUPABASE_URL: zod_1.z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().min(1),
    SUPABASE_ANON_KEY: zod_1.z.string().optional(),
    OPENROUTER_API_KEY: zod_1.z.string().optional(),
    OPENROUTER_MODEL: zod_1.z.string().default("openrouter/free"),
    GEMINI_API_KEY: zod_1.z.string().optional(),
    GEMINI_MODEL: zod_1.z.string().default("gemini-2.5-flash"),
    RESEND_API_KEY: zod_1.z.string().optional(),
    BREVO_API_KEY: zod_1.z.string().optional(),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().default(587),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    SMTP_FROM: zod_1.z.string().default("StudyMind AI <noreply@studymindai.com>"),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.warn("Environment validation warnings:", parsed.error.flatten().fieldErrors);
}
exports.env = {
    port: Number(process.env.PORT) || 5000,
    nodeEnv: process.env.NODE_ENV || "development",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
    openRouterModel: process.env.OPENROUTER_MODEL || "openrouter/free",
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    resendApiKey: process.env.RESEND_API_KEY || "",
    brevoApiKey: process.env.BREVO_API_KEY || "",
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: Number(process.env.SMTP_PORT) || 587,
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    smtpFrom: process.env.SMTP_FROM || "StudyMind AI <noreply@studymindai.com>",
};
