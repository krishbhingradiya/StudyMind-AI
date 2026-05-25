declare class EmailService {
    private resend;
    private smtpTransporter;
    constructor();
    /**
     * Generates a beautifully formatted HTML email template with StudyMind branding
     */
    private getOTPEmailHTML;
    /**
     * Send the OTP code to a user's email
     */
    sendOTP(email: string, otp: string, type?: "signup" | "reset" | "login"): Promise<boolean>;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=emailService.d.ts.map