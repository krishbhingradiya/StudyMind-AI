import crypto from "crypto";

interface OTPSession {
  code: string;
  expiresAt: Date;
  attempts: number;
  signupData?: any; // stores the user's signup data during verification
  lastSentAt: Date;
  sendCount: number; // tracks sends for rate limiting
  windowStart: Date; // tracks start of 10 min window
}

class OTPService {
  // Memory store for OTPs
  private store = new Map<string, OTPSession>();

  constructor() {
    // Periodically clean up expired OTPs every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Generates a secure 6-digit numeric OTP
   */
  generateOTP(): string {
    return Math.floor(100000 + crypto.randomInt(900000)).toString();
  }

  /**
   * Set or refresh OTP for an email
   */
  async createOTP(email: string, signupData?: any): Promise<{ code: string; cooldownRemaining: number }> {
    const cleanEmail = email.toLowerCase().trim();
    const now = new Date();
    const existing = this.store.get(cleanEmail);

    // 1. Check Rate Limit (max 3 sends per email per 10 minutes)
    if (existing) {
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      
      // If the 10-minute window has passed, reset the window and send count
      if (existing.windowStart < tenMinutesAgo) {
        existing.windowStart = now;
        existing.sendCount = 0;
      }

      if (existing.sendCount >= 3) {
        const timeSinceWindowStart = now.getTime() - existing.windowStart.getTime();
        const minutesRemaining = Math.ceil((10 * 60 * 1000 - timeSinceWindowStart) / (60 * 1000));
        throw new Error(`Too many verification attempts. Please try again in ${minutesRemaining} minutes.`);
      }

      // 2. Check Resend Cooldown (60 seconds)
      const secondsSinceLastSent = (now.getTime() - existing.lastSentAt.getTime()) / 1000;
      if (secondsSinceLastSent < 60) {
        return {
          code: existing.code,
          cooldownRemaining: Math.ceil(60 - secondsSinceLastSent),
        };
      }
    }

    const code = this.generateOTP();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes expiry

    const newSession: OTPSession = {
      code,
      expiresAt,
      attempts: 0,
      signupData: signupData || (existing ? existing.signupData : undefined),
      lastSentAt: now,
      sendCount: existing ? existing.sendCount + 1 : 1,
      windowStart: existing ? existing.windowStart : now,
    };

    this.store.set(cleanEmail, newSession);
    return { code, cooldownRemaining: 0 };
  }

  /**
   * Verify the OTP for a given email
   */
  verifyOTP(email: string, code: string): { success: boolean; signupData?: any; error?: string } {
    const cleanEmail = email.toLowerCase().trim();
    const now = new Date();
    const session = this.store.get(cleanEmail);

    if (!session) {
      return { success: false, error: "No active verification request found. Please request a new code." };
    }

    // Check expiry
    if (session.expiresAt < now) {
      this.store.delete(cleanEmail);
      return { success: false, error: "Verification code has expired. Please request a new one." };
    }

    // Check attempts limit (max 3 attempts)
    if (session.attempts >= 3) {
      this.store.delete(cleanEmail);
      return { success: false, error: "Too many failed attempts. This code has been invalidated." };
    }

    session.attempts += 1;

    if (session.code !== code) {
      return { 
        success: false, 
        error: `Invalid verification code. ${3 - session.attempts} attempts remaining.` 
      };
    }

    // Successful verification
    const signupData = session.signupData;
    this.store.delete(cleanEmail); // Delete OTP after successful verification

    return { success: true, signupData };
  }

  /**
   * Helper to fetch cooldown remaining for an email
   */
  getCooldown(email: string): number {
    const cleanEmail = email.toLowerCase().trim();
    const session = this.store.get(cleanEmail);
    if (!session) return 0;

    const secondsSinceLastSent = (new Date().getTime() - session.lastSentAt.getTime()) / 1000;
    return secondsSinceLastSent < 60 ? Math.ceil(60 - secondsSinceLastSent) : 0;
  }

  /**
   * Clean up expired sessions from memory
   */
  private cleanup() {
    const now = new Date();
    for (const [email, session] of this.store.entries()) {
      if (session.expiresAt < now) {
        this.store.delete(email);
      }
    }
  }
}

export const otpService = new OTPService();
