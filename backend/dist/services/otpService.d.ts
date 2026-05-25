declare class OTPService {
    private store;
    constructor();
    /**
     * Generates a secure 6-digit numeric OTP
     */
    generateOTP(): string;
    /**
     * Set or refresh OTP for an email
     */
    createOTP(email: string, signupData?: any): Promise<{
        code: string;
        cooldownRemaining: number;
    }>;
    /**
     * Verify the OTP for a given email
     */
    verifyOTP(email: string, code: string): {
        success: boolean;
        signupData?: any;
        error?: string;
    };
    /**
     * Helper to fetch cooldown remaining for an email
     */
    getCooldown(email: string): number;
    /**
     * Clean up expired sessions from memory
     */
    private cleanup;
}
export declare const otpService: OTPService;
export {};
//# sourceMappingURL=otpService.d.ts.map