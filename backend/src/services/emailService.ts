import { Resend } from "resend";
import nodemailer from "nodemailer";
import { env } from "../config/env";

class EmailService {
  private resend: Resend | null = null;
  private smtpTransporter: nodemailer.Transporter | null = null;
  private isProduction: boolean;

  constructor() {
    this.isProduction = env.nodeEnv === "production";

    // Initialize SMTP if configuration is available (works in both dev and production)
    if (env.smtpHost && env.smtpUser && env.smtpPass) {
      try {
        const isGmail = env.smtpHost.includes("gmail.com");
        const transportConfig: any = {
          host: isGmail ? "smtp.gmail.com" : env.smtpHost,
          port: isGmail ? 465 : env.smtpPort,
          secure: isGmail ? true : env.smtpPort === 465,
          pool: true,
          family: 4, // Force IPv4 to prevent ENETUNREACH ipv6 connection errors on Render/cloud
          connectionTimeout: 10000, // 10 seconds timeout for reliability
          greetingTimeout: 10000,
          socketTimeout: 15000,
          auth: {
            user: env.smtpUser,
            pass: env.smtpPass,
          },
        };

        this.smtpTransporter = nodemailer.createTransport(transportConfig);
        console.log("\x1b[32m%s\x1b[0m", `[EmailService] SMTP Transporter initialized successfully with ${isGmail ? "Gmail (smtp.gmail.com)" : env.smtpHost}`);
      } catch (err) {
        console.error("[EmailService] Failed to initialize SMTP transporter:", err);
      }
    }

    if (env.resendApiKey && env.resendApiKey.startsWith("re_")) {
      this.resend = new Resend(env.resendApiKey);
      console.log("\x1b[32m%s\x1b[0m", "[EmailService] Resend API initialized successfully.");
    } else if (!this.smtpTransporter) {
      console.log("\x1b[33m%s\x1b[0m", "[EmailService] Warning: No email provider configured. Emails will be logged to console (sandbox mode).");
    }
  }

  /**
   * Generates a beautifully formatted HTML email template with StudyMind branding
   */
  private getOTPEmailHTML(otp: string, type: "signup" | "reset" | "login"): string {
    let title = "Verify Your Account";
    let leadText = "Use the verification code below to proceed.";

    if (type === "signup") {
      title = "Account Verification";
      leadText = "Thank you for signing up with StudyMind AI. Please enter the verification code below to complete your registration.";
    } else if (type === "login") {
      title = "Login Verification";
      leadText = "A login attempt was made to your StudyMind AI account. Please enter the verification code below to confirm your identity.";
    } else if (type === "reset") {
      title = "Password Reset";
      leadText = "We received a request to reset your password. Please enter the verification code below to proceed with the reset.";
    }
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${title}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f5f7;">
            <tr>
              <td align="center" style="padding: 48px 20px;">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
                  
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding-bottom: 32px;">
                      <span style="font-size: 22px; font-weight: 700; color: #1a1a2e; letter-spacing: -0.3px;">StudyMind<span style="color: #4f46e5;">AI</span></span>
                    </td>
                  </tr>

                  <!-- Main Card -->
                  <tr>
                    <td style="background-color: #ffffff; border: 1px solid #e2e5ea; border-radius: 8px; padding: 40px 36px;">
                      
                      <!-- Title -->
                      <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 600; color: #1a1a2e; text-align: center;">${title}</h1>
                      
                      <!-- Lead Text -->
                      <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.7; color: #5a5f72; text-align: center;">${leadText}</p>
                      
                      <!-- OTP Code -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 24px 0;">
                            <div style="display: inline-block; background-color: #f8f9fb; border: 1px solid #e2e5ea; border-radius: 6px; padding: 16px 36px;">
                              <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1a1a2e;">${otp}</span>
                            </div>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Expiry Notice -->
                      <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.6; color: #5a5f72; text-align: center;">This code expires in <strong style="color: #1a1a2e;">15 minutes</strong>. For your security, please do not share this code with anyone.</p>
                      
                      <!-- Divider -->
                      <hr style="border: none; border-top: 1px solid #eef0f3; margin: 28px 0;">
                      
                      <!-- Disclaimer -->
                      <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #8b8fa3; text-align: center;">If you did not request this code, no action is needed. Your account remains secure.</p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding: 28px 0 0 0;">
                      <p style="margin: 0; font-size: 12px; color: #9ca0ae;">&copy; ${new Date().getFullYear()} StudyMind AI. All rights reserved.</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  /**
   * Send the OTP code to a user's email
   */
  async sendOTP(email: string, otp: string, type: "signup" | "reset" | "login" = "signup"): Promise<boolean> {
    let subject = "StudyMind AI - Verification Code";
    if (type === "signup") {
      subject = "StudyMind AI - Verify Your Account";
    } else if (type === "login") {
      subject = "StudyMind AI - Verify Your Login";
    } else if (type === "reset") {
      subject = "StudyMind AI - Reset Your Password";
    }

    const html = this.getOTPEmailHTML(otp, type);
    const text = `Your StudyMind AI Verification Code is: ${otp}. It is valid for 15 minutes.`;

    // Try SMTP first (sends from your configured Gmail/SMTP account)
    if (this.smtpTransporter) {
      try {
        await this.smtpTransporter.sendMail({
          from: env.smtpFrom,
          to: email,
          subject,
          text,
          html,
        });
        console.log(`[EmailService] Email successfully sent to ${email} via SMTP`);
        return true;
      } catch (err) {
        console.error("[EmailService] SMTP failed, falling back to Resend:", (err as Error).message);
      }
    }

    // Fallback to Resend
    if (this.resend) {
      return this.sendViaResend(email, subject, html, text);
    }

    // Last resort: log to console (sandbox mode)
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

  /**
   * Send email via Resend API (used in production)
   * Note: Resend free tier only allows sending from onboarding@resend.dev
   * To send from your own domain, you need to add and verify a domain in Resend.
   */
  private async sendViaResend(email: string, subject: string, html: string, text?: string): Promise<boolean> {
    if (!this.resend) return false;
    try {
      // Resend free tier ONLY allows sending from onboarding@resend.dev
      // To use studymindai.admin@gmail.com, you must add + verify a custom domain in Resend
      const fromAddress = "StudyMind AI <onboarding@resend.dev>";

      const { data, error } = await this.resend.emails.send({
        from: fromAddress,
        to: email,
        subject,
        html,
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log(`[EmailService] Email sent to ${email} via Resend (ID: ${data?.id})`);
      return true;
    } catch (err) {
      console.error("[EmailService] Resend failed:", (err as Error).message);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    const subject = "Welcome to StudyMind AI";
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to StudyMind AI</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f5f7;">
            <tr>
              <td align="center" style="padding: 48px 20px;">
                <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
                  
                  <!-- Logo -->
                  <tr>
                    <td align="center" style="padding-bottom: 32px;">
                      <span style="font-size: 22px; font-weight: 700; color: #1a1a2e; letter-spacing: -0.3px;">StudyMind<span style="color: #4f46e5;">AI</span></span>
                    </td>
                  </tr>

                  <!-- Main Card -->
                  <tr>
                    <td style="background-color: #ffffff; border: 1px solid #e2e5ea; border-radius: 8px; padding: 40px 36px;">
                      
                      <!-- Greeting -->
                      <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #1a1a2e; text-align: center;">Welcome, ${name}</h1>
                      
                      <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.7; color: #5a5f72; text-align: center;">Your account has been successfully created. StudyMind AI is designed to help you study smarter with intelligent tools tailored to your learning needs.</p>
                      
                      <!-- Divider -->
                      <hr style="border: none; border-top: 1px solid #eef0f3; margin: 0 0 28px 0;">
                      
                      <!-- Features -->
                      <p style="margin: 0 0 16px 0; font-size: 13px; font-weight: 600; color: #1a1a2e; text-transform: uppercase; letter-spacing: 0.5px;">What you can do</p>
                      
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                        <tr>
                          <td style="padding: 10px 0; border-bottom: 1px solid #f0f1f4;">
                            <strong style="font-size: 13px; color: #1a1a2e;">AI-Powered Insights</strong>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7084; line-height: 1.5;">Analyze your study materials and extract key concepts instantly.</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; border-bottom: 1px solid #f0f1f4;">
                            <strong style="font-size: 13px; color: #1a1a2e;">Smart Quizzes</strong>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7084; line-height: 1.5;">Test your knowledge with dynamically generated assessments.</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; border-bottom: 1px solid #f0f1f4;">
                            <strong style="font-size: 13px; color: #1a1a2e;">Personalized Roadmaps</strong>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7084; line-height: 1.5;">Get a tailored study plan based on your progress and weak areas.</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0;">
                            <strong style="font-size: 13px; color: #1a1a2e;">Handwriting Recognition</strong>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7084; line-height: 1.5;">Convert your handwritten notes to structured digital text.</p>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- CTA Button -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 4px 0 24px 0;">
                            <a href="${env.frontendUrl || 'http://localhost:3000'}/dashboard" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600; font-size: 14px;">Open Dashboard</a>
                          </td>
                        </tr>
                      </table>
                      
                      <!-- Closing -->
                      <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #8b8fa3; text-align: center;">If you have any questions, feel free to reach out to our support team. We're here to help.</p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding: 28px 0 0 0;">
                      <p style="margin: 0; font-size: 12px; color: #9ca0ae;">&copy; ${new Date().getFullYear()} StudyMind AI. All rights reserved.</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const text = `Welcome to StudyMind AI, ${name}.\n\nYour account has been successfully created. StudyMind AI is designed to help you study smarter with AI-powered insights, smart quizzes, personalized roadmaps, and handwriting recognition.\n\nHead over to your dashboard to get started.`;

    // Try SMTP first
    if (this.smtpTransporter) {
      try {
        await this.smtpTransporter.sendMail({
          from: env.smtpFrom,
          to: email,
          subject,
          text,
          html,
        });
        console.log(`[EmailService] Welcome email sent to ${email} via SMTP`);
        return true;
      } catch (err) {
        console.error("[EmailService] SMTP failed for welcome email:", (err as Error).message);
      }
    }

    // Fallback to Resend
    if (this.resend) {
      return this.sendViaResend(email, subject, html, text);
    }
    return false;
  }
}

export const emailService = new EmailService();
