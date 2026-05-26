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
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [formData, setFormData] = useState<FormData | null>(null);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpError, setOtpError] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
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

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.sendLoginOtp({
        email: data.email,
        password: data.password,
      });

      if (!res.success) {
        toast.error(res.error || "Invalid email or password.");
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

  const onVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || otp.length !== 6) return;

    setIsVerifying(true);
    setOtpError(false);

    try {
      const verifyRes = await api.verifyLoginOtp({
        email: formData.email,
        otp,
      });

      if (!verifyRes.success) {
        setOtpError(true);
        toast.error(verifyRes.error || "Invalid or expired verification code.");
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
          toast.error("Login failed. Please try signing in again.");
          setStep("form");
          setOtp("");
          setIsVerifying(false);
          return;
        }
        signedIn = true;
      }

      // Sync/Check profile
      const profileRes = await api.getProfile();
      if (!profileRes.success) {
        const user = verifyRes.data?.user;
        const meta = user?.user_metadata || {};
        await api.createProfile({
          full_name: meta.full_name || "Student",
          university: meta.university,
          branch: meta.branch,
          semester: meta.semester,
        });
      }

      toast.success("Welcome back!");
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
        type: "login",
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
    <div className="flex min-h-screen items-center justify-center grid-bg p-4">
      <Card className="glass w-full max-w-md overflow-hidden">
        <AnimatePresence mode="wait">
          {step === "form" ? (
            <motion.div
              key="login-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <CardHeader className="text-center">
                <Logo className="justify-center mb-4" />
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>Sign in to your StudyMind account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Input placeholder="Email" type="email" {...register("email")} />
                    {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>}
                  </div>
                  <div>
                    <Input placeholder="Password" type="password" {...register("password")} />
                    {errors.password && <p className="mt-1 text-xs text-destructive">{errors.password.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" variant="gradient" disabled={isSubmitting}>
                    {isSubmitting ? "Checking credentials..." : "Sign In"}
                  </Button>
                </form>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  <Link href="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
                </p>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  No account? <Link href="/signup" className="text-primary hover:underline">Sign up</Link>
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
                <CardTitle>Security Verification</CardTitle>
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
                    Back to login form
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
