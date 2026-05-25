"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = void 0;
const resend_1 = require("resend");
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
class EmailService {
    resend = null;
    smtpTransporter = null;
    constructor() {
        if (env_1.env.smtpHost && env_1.env.smtpUser && env_1.env.smtpPass) {
            try {
                this.smtpTransporter = nodemailer_1.default.createTransport({
                    host: env_1.env.smtpHost,
                    port: env_1.env.smtpPort,
                    secure: env_1.env.smtpPort === 465, // true for 465, false for other ports (587, 25)
                    auth: {
                        user: env_1.env.smtpUser,
                        pass: env_1.env.smtpPass,
                    },
                });
                console.log("\x1b[32m%s\x1b[0m", `[EmailService] SMTP initialized successfully with host: ${env_1.env.smtpHost}`);
            }
            catch (err) {
                console.error("[EmailService] Failed to initialize SMTP transporter:", err);
            }
        }
        if (env_1.env.resendApiKey && env_1.env.resendApiKey.startsWith("re_")) {
            this.resend = new resend_1.Resend(env_1.env.resendApiKey);
        }
        else if (!this.smtpTransporter) {
            console.log("\x1b[33m%s\x1b[0m", "[EmailService] Warning: SMTP and RESEND_API_KEY are not configured. Email sending will run in Sandbox Mode (logging to console).");
        }
    }
    /**
     * Generates a beautifully formatted HTML email template with StudyMind branding
     */
    getOTPEmailHTML(otp, type) {
        let title = "Verify Your Account";
        let leadText = "Use the verification code below to proceed.";
        if (type === "signup") {
            title = "Verify Your StudyMind AI Account";
            leadText = "Welcome to StudyMind AI! Use the verification code below to complete your registration.";
        }
        else if (type === "login") {
            title = "Verify Your Login Attempt";
            leadText = "We noticed a login attempt to your StudyMind AI account. Use the verification code below to complete your sign in.";
        }
        else if (type === "reset") {
            title = "Reset Your StudyMind AI Password";
            leadText = "We received a request to reset your password. Use the verification code below to proceed.";
        }
        return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              background-color: #0d0e12;
              color: #e2e8f0;
              margin: 0;
              padding: 0;
              -webkit-font-smoothing: antialiased;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .card {
              background-color: #151821;
              border: 1px solid #272a37;
              border-radius: 16px;
              padding: 40px;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
            }
            .logo {
              font-size: 24px;
              font-weight: 800;
              color: #6366f1;
              text-align: center;
              margin-bottom: 30px;
              letter-spacing: -0.5px;
            }
            .logo span {
              color: #f43f5e;
            }
            h1 {
              font-size: 22px;
              font-weight: 700;
              color: #ffffff;
              text-align: center;
              margin-top: 0;
              margin-bottom: 16px;
            }
            p {
              font-size: 15px;
              line-height: 1.6;
              color: #94a3b8;
              text-align: center;
              margin-bottom: 30px;
            }
            .otp-container {
              text-align: center;
              margin: 30px 0;
            }
            .otp-code {
              font-family: 'Courier New', Courier, monospace;
              font-size: 36px;
              font-weight: 800;
              letter-spacing: 6px;
              color: #ffffff;
              background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%);
              border: 1px solid #4f46e5;
              padding: 16px 32px;
              border-radius: 12px;
              display: inline-block;
              box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              font-size: 12px;
              color: #475569;
            }
            .warning {
              font-size: 13px;
              color: #f43f5e;
              background-color: rgba(244, 63, 94, 0.1);
              border: 1px solid rgba(244, 63, 94, 0.2);
              border-radius: 8px;
              padding: 12px;
              margin-top: 24px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="logo">StudyMind<span>AI</span></div>
              <h1>${title}</h1>
              <p>${leadText}</p>
              
              <div class="otp-container">
                <span class="otp-code">${otp}</span>
              </div>
              
              <p style="font-size: 13px; margin-bottom: 0;">This code is only valid for <strong>5 minutes</strong>. For security, do not share this code with anyone.</p>
              
              <div class="warning">
                If you did not request this code, you can safely ignore this email.
              </div>
            </div>
            <div class="footer">
              &copy; ${new Date().getFullYear()} StudyMind AI. All rights reserved.
            </div>
          </div>
        </body>
      </html>
    `;
    }
    /**
     * Send the OTP code to a user's email
     */
    async sendOTP(email, otp, type = "signup") {
        let subject = "StudyMind AI - Verification Code";
        if (type === "signup") {
            subject = "StudyMind AI - Verify Your Account";
        }
        else if (type === "login") {
            subject = "StudyMind AI - Verify Your Login";
        }
        else if (type === "reset") {
            subject = "StudyMind AI - Reset Your Password";
        }
        const html = this.getOTPEmailHTML(otp, type);
        // 1. Try sending via SMTP
        if (this.smtpTransporter) {
            try {
                await this.smtpTransporter.sendMail({
                    from: env_1.env.smtpFrom,
                    to: email,
                    subject: subject,
                    html: html,
                });
                console.log(`[EmailService] Email successfully sent to ${email} via SMTP`);
                return true;
            }
            catch (err) {
                console.error("[EmailService] Failed to send email via SMTP:", err);
            }
        }
        // 2. Try sending via Resend
        if (this.resend) {
            try {
                // In Resend sandbox/testing without a custom domain, we must use onboarding@resend.dev as the from address
                const { data, error } = await this.resend.emails.send({
                    from: "StudyMind AI <onboarding@resend.dev>",
                    to: email,
                    subject: subject,
                    html: html,
                });
                if (error) {
                    console.error("[EmailService] Resend email send error:", error);
                    throw new Error(error.message);
                }
                console.log(`[EmailService] Email successfully sent to ${email} via Resend (ID: ${data?.id})`);
                return true;
            }
            catch (err) {
                console.error("[EmailService] Failed to send email via Resend:", err);
            }
        }
        // 3. Fallback: log to console
        console.log("\n");
        console.log("\x1b[35m%s\x1b[0m", "=================================================================");
        console.log("\x1b[36m%s\x1b[0m", "                    STUDYMIND AI OTP SANDBOX                     ");
        console.log("\x1b[35m%s\x1b[0m", "=================================================================");
        console.log(`\x1b[33mTo:\x1b[0m ${email}`);
        console.log(`\x1b[33mSubject:\x1b[0m ${subject}`);
        console.log(`\x1b[33mOTP Code:\x1b[0m \x1b[1m\x1b[32m${otp}\x1b[0m`);
        console.log("\x1b[35m%s\x1b[0m", "=================================================================");
        console.log("\n");
        return true;
    }
}
exports.emailService = new EmailService();
//# sourceMappingURL=emailService.js.map