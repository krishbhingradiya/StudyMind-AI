import { Request, Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../config/supabase";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { otpService } from "../services/otpService";
import { emailService } from "../services/emailService";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

const updateProfileSchema = z.object({
  full_name: z.string().min(2).optional(),
  university: z.string().optional(),
  branch: z.string().optional(),
  semester: z.number().min(1).max(12).optional(),
  avatar_url: z.string().url().optional(),
});

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user.id)
      .single();

    if (!error && data) return sendSuccess(res, data);

    const { data: authData } = await supabase.auth.admin.getUserById(req.user.id);
    const meta = (authData?.user?.user_metadata || {}) as Record<string, unknown>;

    const { data: created, error: createError } = await supabase
      .from("users")
      .upsert({
        id: req.user.id,
        email: req.user.email,
        full_name: (meta.full_name as string) || "Student",
        university: meta.university as string | undefined,
        branch: meta.branch as string | undefined,
        semester: meta.semester as number | undefined,
      })
      .select()
      .single();

    if (createError || !created) return sendError(res, "Profile not found", 404);
    return sendSuccess(res, created);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.message, 400);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .update(parsed.data)
      .eq("id", req.user.id)
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data, "Profile updated");
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function createProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const { full_name, university, branch, semester } = req.body as {
      full_name: string;
      university?: string;
      branch?: string;
      semester?: number;
    };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("users")
      .upsert({
        id: req.user.id,
        email: req.user.email,
        full_name: full_name || "Student",
        university,
        branch,
        semester,
      })
      .select()
      .single();

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data, "Profile created", 201);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function sendLoginOtp(req: Request, res: Response) {
  try {
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6, "Password must be at least 6 characters"),
    });

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const { email, password } = parsed.data;

    // Create a temporary client with supabaseUrl and supabaseAnonKey to sign in.
    const tempClient = createClient(env.supabaseUrl, env.supabaseAnonKey || env.supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await tempClient.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    });

    if (authError || !authData.user) {
      // Check if the email exists to give a specific error message
      const supabase = getSupabaseAdmin();
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();

      if (existingUser) {
        return sendError(res, "Incorrect password. Please try again.", 401);
      }
      return sendError(res, "No account found with this email address.", 401);
    }

    // Generate OTP
    const { code, cooldownRemaining } = await otpService.createOTP(email);

    if (cooldownRemaining > 0) {
      return sendError(res, `Please wait ${cooldownRemaining} seconds before requesting another code.`, 429);
    }

    // Send OTP email
    await emailService.sendOTP(email, code, "login");

    return sendSuccess(res, { cooldownRemaining: 60 }, "Verification code sent to your email.");
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function verifyLoginOtp(req: Request, res: Response) {
  try {
    const verifySchema = z.object({
      email: z.string().email(),
      otp: z.string().length(6, "Verification code must be exactly 6 digits"),
    });

    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const { email, otp } = parsed.data;

    // Verify OTP
    const result = otpService.verifyOTP(email, otp);
    if (!result.success) {
      return sendError(res, result.error || "Invalid or expired verification code.", 400);
    }

    return sendSuccess(res, null, "Verification successful!");
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function sendOtp(req: Request, res: Response) {
  try {
    const signupSchema = z.object({
      email: z.string().email(),
      password: z.string().min(6, "Password must be at least 6 characters"),
      full_name: z.string().min(2, "Name must be at least 2 characters"),
      university: z.string().optional(),
      branch: z.string().optional(),
      semester: z.number().optional(),
    });

    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const { email } = parsed.data;
    const supabase = getSupabaseAdmin();

    // Check if the user already exists in public.users table or auth system
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (existingUser) {
      return sendError(res, "An account with this email address already exists.", 400);
    }

    // Generate OTP
    const { code, cooldownRemaining } = await otpService.createOTP(email, parsed.data);

    if (cooldownRemaining > 0) {
      return sendError(res, `Please wait ${cooldownRemaining} seconds before requesting another code.`, 429);
    }

    // Send OTP email
    await emailService.sendOTP(email, code, "signup");

    return sendSuccess(res, { cooldownRemaining: 60 }, "Verification code sent to your email.");
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function verifyOtp(req: Request, res: Response) {
  try {
    const verifySchema = z.object({
      email: z.string().email(),
      otp: z.string().length(6, "Verification code must be exactly 6 digits"),
    });

    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const { email, otp } = parsed.data;

    // Verify OTP
    const result = otpService.verifyOTP(email, otp);
    if (!result.success || !result.signupData) {
      return sendError(res, result.error || "Invalid or expired verification code.", 400);
    }

    const signupData = result.signupData;

    let supabase;
    try {
      supabase = getSupabaseAdmin();
    } catch (configErr) {
      console.error("[verifyOtp] Supabase not configured:", (configErr as Error).message);
      return sendError(res, "Server configuration error. Please contact support.", 500);
    }

    // 1. Create user in Supabase auth
    let authData, authError;
    try {
      const result = await supabase.auth.admin.createUser({
        email: signupData.email,
        password: signupData.password,
        email_confirm: true,
        user_metadata: {
          full_name: signupData.full_name,
          university: signupData.university,
          branch: signupData.branch,
          semester: signupData.semester,
        },
      });
      authData = result.data;
      authError = result.error;
    } catch (supabaseErr) {
      const errMsg = (supabaseErr as Error).message || "";
      console.error("[verifyOtp] Supabase createUser exception:", errMsg);
      if (errMsg.includes("HTML") || errMsg.includes("<!DOCTYPE") || errMsg.includes("<html")) {
        return sendError(res, "Server configuration error: Unable to connect to authentication service.", 500);
      }
      return sendError(res, "Failed to create account. Please try again.", 500);
    }

    if (authError || !authData?.user) {
      const errorMessage = authError?.message || "Failed to create account.";
      console.error("[verifyOtp] Supabase auth error:", errorMessage);
      // Check if it's a "user already exists" error
      if (errorMessage.toLowerCase().includes("already") || errorMessage.toLowerCase().includes("exists")) {
        return sendError(res, "An account with this email already exists. Please try logging in.", 400);
      }
      return sendError(res, errorMessage, 400);
    }

    // 2. Create profile in users table
    let profileData, profileError;
    try {
      const result = await supabase
        .from("users")
        .upsert({
          id: authData.user.id,
          email: signupData.email,
          full_name: signupData.full_name || "Student",
          university: signupData.university,
          branch: signupData.branch,
          semester: signupData.semester,
        })
        .select()
        .single();
      profileData = result.data;
      profileError = result.error;
    } catch (profileErr) {
      console.error("[verifyOtp] Profile creation exception:", (profileErr as Error).message);
      // Clean up auth user
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
      return sendError(res, "Failed to create user profile. Please try again.", 500);
    }

    if (profileError) {
      // Clean up the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id).catch(() => {});
      console.error("[verifyOtp] Profile error:", profileError.message);
      return sendError(res, "Failed to create user profile. Please try again.", 500);
    }

    // Send welcome email asynchronously
    emailService.sendWelcomeEmail(signupData.email, signupData.full_name || "Student").catch(console.error);

    return sendSuccess(
      res, 
      { user: authData.user, profile: profileData }, 
      "Account created and verified successfully!", 
      201
    );
  } catch (err) {
    const errMsg = (err as Error).message || "";
    console.error("[verifyOtp] Unexpected error:", errMsg);
    if (errMsg.includes("HTML") || errMsg.includes("<!DOCTYPE")) {
      return sendError(res, "Server configuration error. Please contact support.", 500);
    }
    return sendError(res, errMsg || "An unexpected error occurred.", 500);
  }
}

export async function resendOtp(req: Request, res: Response) {
  try {
    const resendSchema = z.object({
      email: z.string().email(),
      type: z.enum(["signup", "reset", "login"]),
    });

    const parsed = resendSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const { email, type } = parsed.data;

    // Generate new OTP (preserves previous signupData/metadata because createOTP handles it)
    const { code, cooldownRemaining } = await otpService.createOTP(email);

    if (cooldownRemaining > 0) {
      return sendError(res, `Please wait ${cooldownRemaining} seconds before requesting another code.`, 429);
    }

    // Send OTP email
    await emailService.sendOTP(email, code, type);

    return sendSuccess(res, { cooldownRemaining: 60 }, "A new verification code has been sent.");
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function forgotPassword(req: Request, res: Response) {
  try {
    const forgotSchema = z.object({
      email: z.string().email(),
    });

    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const { email } = parsed.data;
    const supabase = getSupabaseAdmin();

    // Check if the user exists in public.users table
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (!user || userError) {
      return sendError(res, "No account found with this email address.", 404);
    }

    // Generate OTP
    const { code, cooldownRemaining } = await otpService.createOTP(email);

    if (cooldownRemaining > 0) {
      return sendError(res, `Please wait ${cooldownRemaining} seconds before requesting another code.`, 429);
    }

    // Send OTP email
    await emailService.sendOTP(email, code, "reset");

    return sendSuccess(res, { cooldownRemaining: 60 }, "Password reset code has been sent to your email.");
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const resetSchema = z.object({
      email: z.string().email(),
      otp: z.string().length(6, "Verification code must be exactly 6 digits"),
      newPassword: z.string().min(6, "Password must be at least 6 characters"),
    });

    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const { email, otp, newPassword } = parsed.data;
    const supabase = getSupabaseAdmin();

    // Verify OTP
    const result = otpService.verifyOTP(email, otp);
    if (!result.success) {
      return sendError(res, result.error || "Invalid or expired verification code.", 400);
    }

    // Find user by email in public.users to get their auth ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (userError || !userData) {
      return sendError(res, "No account found with this email address.", 404);
    }

    // Update user password using admin client
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.id,
      { password: newPassword }
    );

    if (updateError) {
      return sendError(res, updateError.message, 500);
    }

    return sendSuccess(res, null, "Password reset successfully!");
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}
