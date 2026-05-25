"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.createProfile = createProfile;
exports.sendLoginOtp = sendLoginOtp;
exports.verifyLoginOtp = verifyLoginOtp;
exports.sendOtp = sendOtp;
exports.verifyOtp = verifyOtp;
exports.resendOtp = resendOtp;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const zod_1 = require("zod");
const supabase_1 = require("../config/supabase");
const apiResponse_1 = require("../utils/apiResponse");
const otpService_1 = require("../services/otpService");
const emailService_1 = require("../services/emailService");
const supabase_js_1 = require("@supabase/supabase-js");
const env_1 = require("../config/env");
const updateProfileSchema = zod_1.z.object({
    full_name: zod_1.z.string().min(2).optional(),
    university: zod_1.z.string().optional(),
    branch: zod_1.z.string().optional(),
    semester: zod_1.z.number().min(1).max(12).optional(),
    avatar_url: zod_1.z.string().url().optional(),
});
async function getProfile(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", req.user.id)
            .single();
        if (!error && data)
            return (0, apiResponse_1.sendSuccess)(res, data);
        const { data: authData } = await supabase.auth.admin.getUserById(req.user.id);
        const meta = (authData?.user?.user_metadata || {});
        const { data: created, error: createError } = await supabase
            .from("users")
            .upsert({
            id: req.user.id,
            email: req.user.email,
            full_name: meta.full_name || "Student",
            university: meta.university,
            branch: meta.branch,
            semester: meta.semester,
        })
            .select()
            .single();
        if (createError || !created)
            return (0, apiResponse_1.sendError)(res, "Profile not found", 404);
        return (0, apiResponse_1.sendSuccess)(res, created);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function updateProfile(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const parsed = updateProfileSchema.safeParse(req.body);
        if (!parsed.success)
            return (0, apiResponse_1.sendError)(res, parsed.error.message, 400);
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        const { data, error } = await supabase
            .from("users")
            .update(parsed.data)
            .eq("id", req.user.id)
            .select()
            .single();
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        return (0, apiResponse_1.sendSuccess)(res, data, "Profile updated");
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function createProfile(req, res) {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const { full_name, university, branch, semester } = req.body;
        const supabase = (0, supabase_1.getSupabaseAdmin)();
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
        if (error)
            return (0, apiResponse_1.sendError)(res, error.message, 500);
        return (0, apiResponse_1.sendSuccess)(res, data, "Profile created", 201);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function sendLoginOtp(req, res) {
    try {
        const loginSchema = zod_1.z.object({
            email: zod_1.z.string().email(),
            password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
        });
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, apiResponse_1.sendError)(res, parsed.error.errors[0]?.message || "Invalid input", 400);
        }
        const { email, password } = parsed.data;
        // Create a temporary client with supabaseUrl and supabaseAnonKey to sign in.
        const tempClient = (0, supabase_js_1.createClient)(env_1.env.supabaseUrl, env_1.env.supabaseAnonKey || env_1.env.supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: authData, error: authError } = await tempClient.auth.signInWithPassword({
            email: email.toLowerCase().trim(),
            password,
        });
        if (authError || !authData.user) {
            // Check if the email exists to give a specific error message
            const supabase = (0, supabase_1.getSupabaseAdmin)();
            const { data: existingUser } = await supabase
                .from("users")
                .select("id")
                .eq("email", email.toLowerCase().trim())
                .maybeSingle();
            if (existingUser) {
                return (0, apiResponse_1.sendError)(res, "Incorrect password. Please try again.", 401);
            }
            return (0, apiResponse_1.sendError)(res, "No account found with this email address.", 401);
        }
        // Generate OTP
        const { code, cooldownRemaining } = await otpService_1.otpService.createOTP(email);
        if (cooldownRemaining > 0) {
            return (0, apiResponse_1.sendError)(res, `Please wait ${cooldownRemaining} seconds before requesting another code.`, 429);
        }
        // Send OTP email
        await emailService_1.emailService.sendOTP(email, code, "login");
        return (0, apiResponse_1.sendSuccess)(res, { cooldownRemaining: 60 }, "Verification code sent to your email.");
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function verifyLoginOtp(req, res) {
    try {
        const verifySchema = zod_1.z.object({
            email: zod_1.z.string().email(),
            otp: zod_1.z.string().length(6, "Verification code must be exactly 6 digits"),
        });
        const parsed = verifySchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, apiResponse_1.sendError)(res, parsed.error.errors[0]?.message || "Invalid input", 400);
        }
        const { email, otp } = parsed.data;
        // Verify OTP
        const result = otpService_1.otpService.verifyOTP(email, otp);
        if (!result.success) {
            return (0, apiResponse_1.sendError)(res, result.error || "Invalid or expired verification code.", 400);
        }
        return (0, apiResponse_1.sendSuccess)(res, null, "Verification successful!");
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function sendOtp(req, res) {
    try {
        const signupSchema = zod_1.z.object({
            email: zod_1.z.string().email(),
            password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
            full_name: zod_1.z.string().min(2, "Name must be at least 2 characters"),
            university: zod_1.z.string().optional(),
            branch: zod_1.z.string().optional(),
            semester: zod_1.z.number().optional(),
        });
        const parsed = signupSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, apiResponse_1.sendError)(res, parsed.error.errors[0]?.message || "Invalid input", 400);
        }
        const { email } = parsed.data;
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        // Check if the user already exists in public.users table or auth system
        const { data: existingUser } = await supabase
            .from("users")
            .select("id")
            .eq("email", email.toLowerCase().trim())
            .maybeSingle();
        if (existingUser) {
            return (0, apiResponse_1.sendError)(res, "An account with this email address already exists.", 400);
        }
        // Generate OTP
        const { code, cooldownRemaining } = await otpService_1.otpService.createOTP(email, parsed.data);
        if (cooldownRemaining > 0) {
            return (0, apiResponse_1.sendError)(res, `Please wait ${cooldownRemaining} seconds before requesting another code.`, 429);
        }
        // Send OTP email
        await emailService_1.emailService.sendOTP(email, code, "signup");
        return (0, apiResponse_1.sendSuccess)(res, { cooldownRemaining: 60 }, "Verification code sent to your email.");
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function verifyOtp(req, res) {
    try {
        const verifySchema = zod_1.z.object({
            email: zod_1.z.string().email(),
            otp: zod_1.z.string().length(6, "Verification code must be exactly 6 digits"),
        });
        const parsed = verifySchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, apiResponse_1.sendError)(res, parsed.error.errors[0]?.message || "Invalid input", 400);
        }
        const { email, otp } = parsed.data;
        // Verify OTP
        const result = otpService_1.otpService.verifyOTP(email, otp);
        if (!result.success || !result.signupData) {
            return (0, apiResponse_1.sendError)(res, result.error || "Invalid or expired verification code.", 400);
        }
        const signupData = result.signupData;
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        // 1. Create user in Supabase auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
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
        if (authError || !authData.user) {
            return (0, apiResponse_1.sendError)(res, authError?.message || "Failed to create account.", 400);
        }
        // 2. Create profile in users table
        const { data: profileData, error: profileError } = await supabase
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
        if (profileError) {
            // Clean up the auth user if profile creation fails
            await supabase.auth.admin.deleteUser(authData.user.id);
            return (0, apiResponse_1.sendError)(res, profileError.message, 500);
        }
        // Send welcome email asynchronously
        emailService_1.emailService.sendWelcomeEmail(signupData.email, signupData.full_name || "Student").catch(console.error);
        return (0, apiResponse_1.sendSuccess)(res, { user: authData.user, profile: profileData }, "Account created and verified successfully!", 201);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function resendOtp(req, res) {
    try {
        const resendSchema = zod_1.z.object({
            email: zod_1.z.string().email(),
            type: zod_1.z.enum(["signup", "reset", "login"]),
        });
        const parsed = resendSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, apiResponse_1.sendError)(res, parsed.error.errors[0]?.message || "Invalid input", 400);
        }
        const { email, type } = parsed.data;
        // Generate new OTP (preserves previous signupData/metadata because createOTP handles it)
        const { code, cooldownRemaining } = await otpService_1.otpService.createOTP(email);
        if (cooldownRemaining > 0) {
            return (0, apiResponse_1.sendError)(res, `Please wait ${cooldownRemaining} seconds before requesting another code.`, 429);
        }
        // Send OTP email
        await emailService_1.emailService.sendOTP(email, code, type);
        return (0, apiResponse_1.sendSuccess)(res, { cooldownRemaining: 60 }, "A new verification code has been sent.");
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function forgotPassword(req, res) {
    try {
        const forgotSchema = zod_1.z.object({
            email: zod_1.z.string().email(),
        });
        const parsed = forgotSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, apiResponse_1.sendError)(res, parsed.error.errors[0]?.message || "Invalid input", 400);
        }
        const { email } = parsed.data;
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        // Check if the user exists in public.users table
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", email.toLowerCase().trim())
            .maybeSingle();
        if (!user || userError) {
            return (0, apiResponse_1.sendError)(res, "No account found with this email address.", 404);
        }
        // Generate OTP
        const { code, cooldownRemaining } = await otpService_1.otpService.createOTP(email);
        if (cooldownRemaining > 0) {
            return (0, apiResponse_1.sendError)(res, `Please wait ${cooldownRemaining} seconds before requesting another code.`, 429);
        }
        // Send OTP email
        await emailService_1.emailService.sendOTP(email, code, "reset");
        return (0, apiResponse_1.sendSuccess)(res, { cooldownRemaining: 60 }, "Password reset code has been sent to your email.");
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
async function resetPassword(req, res) {
    try {
        const resetSchema = zod_1.z.object({
            email: zod_1.z.string().email(),
            otp: zod_1.z.string().length(6, "Verification code must be exactly 6 digits"),
            newPassword: zod_1.z.string().min(6, "Password must be at least 6 characters"),
        });
        const parsed = resetSchema.safeParse(req.body);
        if (!parsed.success) {
            return (0, apiResponse_1.sendError)(res, parsed.error.errors[0]?.message || "Invalid input", 400);
        }
        const { email, otp, newPassword } = parsed.data;
        const supabase = (0, supabase_1.getSupabaseAdmin)();
        // Verify OTP
        const result = otpService_1.otpService.verifyOTP(email, otp);
        if (!result.success) {
            return (0, apiResponse_1.sendError)(res, result.error || "Invalid or expired verification code.", 400);
        }
        // Find user by email in public.users to get their auth ID
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("email", email.toLowerCase().trim())
            .single();
        if (userError || !userData) {
            return (0, apiResponse_1.sendError)(res, "No account found with this email address.", 404);
        }
        // Update user password using admin client
        const { error: updateError } = await supabase.auth.admin.updateUserById(userData.id, { password: newPassword });
        if (updateError) {
            return (0, apiResponse_1.sendError)(res, updateError.message, 500);
        }
        return (0, apiResponse_1.sendSuccess)(res, null, "Password reset successfully!");
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
}
