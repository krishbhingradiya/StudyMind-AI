"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OTPInput } from "@/components/ui/otp-input";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/services/api";

const schema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  university: z.string().min(2, "University must be at least 2 characters"),
  branch: z.string().min(2, "Branch must be at least 2 characters"),
  semester: z.coerce
    .number()
    .min(1, "Semester must be at least 1")
    .max(12, "Semester cannot exceed 12"),
});

type FormData = z.infer<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [formData, setFormData] = useState<FormData | null>(null);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpError, setOtpError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<any>({
    resolver: zodResolver(schema),
  });

  // Handle Cooldown Countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Submit Form to Send OTP
  const onFormSubmit = async (data: FormData) => {
    try {
      const res = await api.sendOtp({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
        university: data.university,
        branch: data.branch,
        semester: data.semester,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to initiate sign up");
        return;
      }

      setFormData(data);
      setStep("otp");
      setCooldown(res.data?.cooldownRemaining || 60);
      toast.success("Verification code sent to your email!");
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    }
  };

  // Step 2: Verify OTP and Login
  const onVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || otp.length !== 6) return;

    setIsVerifying(true);
    setOtpError(false);

    try {
      const verifyRes = await api.verifyOtp({
        email: formData.email,
        otp,
      });

      if (!verifyRes.success) {
        setOtpError(true);
        toast.error(verifyRes.error || "Invalid or expired verification code.");
        setIsVerifying(false);
        return;
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-supabase")) {
        toast.error("Frontend Configuration Error: Supabase environment variables are missing on Vercel. Please check your Vercel project settings.");
        setIsVerifying(false);
        return;
      }

      const supabase = createClient();
      let signedIn = false;

      // If backend returned session tokens, use them directly
      if (verifyRes.data?.session?.access_token && verifyRes.data?.session?.refresh_token) {
        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: verifyRes.data.session.access_token,
          refresh_token: verifyRes.data.session.refresh_token,
        });

        if (!setSessionError) {
          signedIn = true;
        } else {
          console.error("Failed to set session from backend tokens:", setSessionError.message);
          const currentUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "MISSING";
          if (setSessionError.message.includes("Failed to fetch")) {
            toast.error(`Session Setup Error: Failed to fetch. Please verify your Vercel environment variables! (Current Supabase URL: "${currentUrl}")`);
          } else {
            toast.error(`Session Setup Error: ${setSessionError.message}`);
          }
        }
      }

      // Fallback: sign in directly if session tokens weren't available
      if (!signedIn) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) {
          console.error("SignIn fallback failed:", signInError.message);
          const currentUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "MISSING";
          if (signInError.message.includes("Failed to fetch")) {
            toast.error(`Auto-login failed: Failed to fetch. Please verify your Vercel environment variables! (Current Supabase URL: "${currentUrl}")`);
          } else {
            toast.error(`Auto-login failed: ${signInError.message}. Please log in manually.`);
          }
          router.push("/login");
          return;
        }
      }

      // Pre-fetch the profile to make sure dashboard loads seamlessly
      await api.getProfile();

      toast.success("Account created and verified successfully!");
      router.push("/dashboard");
    } catch (err) {
      toast.error("An error occurred during verification. Please try again.");
      setIsVerifying(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!formData || cooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const res = await api.resendOtp({
        email: formData.email,
        type: "signup",
      });

      if (!res.success) {
        toast.error(res.error || "Failed to resend verification code.");
      } else {
        setCooldown(res.data?.cooldownRemaining || 60);
        toast.success("A new verification code has been sent!");
        setOtp(""); // clear input
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center grid-bg p-4 py-12">
      <Card className="glass w-full max-w-md overflow-hidden">
        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div
              key="signup-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <CardHeader className="text-center">
                <Logo className="justify-center mb-4" />
                <CardTitle>Create account</CardTitle>
                <CardDescription>Start your AI-powered study journey</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-3">
                  <div>
                    <Input placeholder="Full Name" {...register("full_name")} />
                    {errors.full_name && (
                      <p className="mt-1 text-xs text-destructive">{errors.full_name.message as string}</p>
                    )}
                  </div>
                  <div>
                    <Input placeholder="Email" type="email" {...register("email")} />
                    {errors.email && (
                      <p className="mt-1 text-xs text-destructive">{errors.email.message as string}</p>
                    )}
                  </div>
                  <div>
                    <Input placeholder="Password" type="password" {...register("password")} />
                    {errors.password && (
                      <p className="mt-1 text-xs text-destructive">{errors.password.message as string}</p>
                    )}
                  </div>
                  <div>
                    <Input placeholder="University" {...register("university")} />
                    {errors.university && (
                      <p className="mt-1 text-xs text-destructive">{errors.university.message as string}</p>
                    )}
                  </div>
                  <div>
                    <Input placeholder="Branch" {...register("branch")} />
                    {errors.branch && (
                      <p className="mt-1 text-xs text-destructive">{errors.branch.message as string}</p>
                    )}
                  </div>
                  <div>
                    <Input placeholder="Semester" type="number" {...register("semester")} />
                    {errors.semester && (
                      <p className="mt-1 text-xs text-destructive">{errors.semester.message as string}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full mt-2" variant="gradient" disabled={isSubmitting}>
                    {isSubmitting ? "Sending OTP..." : "Create Account"}
                  </Button>
                </form>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </CardContent>
            </motion.div>
          ) : (
            <motion.div
              key="otp-verification"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CardHeader className="text-center">
                <Logo className="justify-center mb-4" />
                <CardTitle>Verify Your Email</CardTitle>
                <CardDescription className="px-2">
                  We've sent a 6-digit verification code to <br />
                  <strong className="text-foreground">{formData?.email}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={onVerifySubmit} className="space-y-6">
                  <div className="py-2">
                    <OTPInput
                      value={otp}
                      onChange={setOtp}
                      error={otpError}
                      disabled={isVerifying}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    variant="gradient"
                    disabled={otp.length !== 6 || isVerifying}
                  >
                    {isVerifying ? "Verifying..." : "Verify Code"}
                  </Button>
                </form>

                <div className="mt-6 flex flex-col items-center justify-center gap-2 text-sm">
                  <span className="text-muted-foreground">Didn't receive the code?</span>
                  <button
                    onClick={handleResendOtp}
                    disabled={cooldown > 0 || isResending}
                    className="text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                  </button>

                  <button
                    onClick={() => {
                      setStep("form");
                      setOtp("");
                    }}
                    className="mt-4 text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Change email / Edit profile details
                  </button>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}
