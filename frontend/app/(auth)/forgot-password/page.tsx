"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OTPInput } from "@/components/ui/otp-input";
import { api } from "@/services/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [verifiedOtp, setVerifiedOtp] = useState("");

  // Handle Cooldown Countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Step 1: Request Password Reset OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const res = await api.forgotPassword({ email });
      if (!res.success) {
        toast.error(res.error || "Failed to send verification code.");
      } else {
        setStep("otp");
        setCooldown(res.data?.cooldownRemaining || 60);
        toast.success("Password reset code sent to your email!");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP only
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) return;

    setOtpError(false);
    setVerifiedOtp(otp);
    setStep("password");
  };

  // Step 3: Reset Password with verified OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.resetPassword({
        email,
        otp: verifiedOtp,
        newPassword,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to reset password.");
        // Go back to OTP step if code was invalid
        if (res.error?.toLowerCase().includes("invalid") || res.error?.toLowerCase().includes("expired")) {
          setStep("otp");
          setOtp("");
          setOtpError(true);
        }
      } else {
        toast.success("Password reset successfully! Please sign in.");
        router.push("/login");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!email || cooldown > 0 || isLoading) return;

    setIsLoading(true);
    try {
      const res = await api.resendOtp({ email, type: "reset" });
      if (!res.success) {
        toast.error(res.error || "Failed to resend code.");
      } else {
        setCooldown(res.data?.cooldownRemaining || 60);
        toast.success("A new code has been sent!");
        setOtp("");
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const slideVariants = {
    enter: { opacity: 0, x: 20 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="flex min-h-screen items-center justify-center grid-bg p-4 py-12">
      <Card className="glass w-full max-w-md overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ─── Step 1: Email ─── */}
          {step === "email" && (
            <motion.div
              key="step-email"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <CardHeader className="text-center">
                <Logo className="justify-center mb-4" />
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>
                  Enter your email address and we&apos;ll send you a verification code
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <Input
                    placeholder="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    variant="gradient"
                    disabled={isLoading || !email}
                  >
                    {isLoading ? "Sending Code..." : "Send Verification Code"}
                  </Button>
                </form>
                <p className="mt-6 text-center text-sm">
                  <Link href="/login" className="text-primary hover:underline">
                    Back to login
                  </Link>
                </p>
              </CardContent>
            </motion.div>
          )}

          {/* ─── Step 2: OTP Verification ─── */}
          {step === "otp" && (
            <motion.div
              key="step-otp"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <CardHeader className="text-center">
                <Logo className="justify-center mb-4" />
                <CardTitle>Verify Your Identity</CardTitle>
                <CardDescription className="px-2">
                  Enter the 6-digit code sent to <br />
                  <strong className="text-foreground">{email}</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="py-2">
                    <OTPInput
                      value={otp}
                      onChange={setOtp}
                      error={otpError}
                      disabled={isLoading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    variant="gradient"
                    disabled={otp.length !== 6 || isLoading}
                  >
                    Verify Code
                  </Button>
                </form>

                <div className="mt-6 flex flex-col items-center justify-center gap-2 text-sm">
                  <span className="text-muted-foreground">Didn&apos;t receive the code?</span>
                  <button
                    onClick={handleResendOtp}
                    disabled={cooldown > 0 || isLoading}
                    className="text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline"
                  >
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                  </button>

                  <button
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setOtpError(false);
                    }}
                    className="mt-4 text-xs text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Change email
                  </button>
                </div>
              </CardContent>
            </motion.div>
          )}

          {/* ─── Step 3: New Password ─── */}
          {step === "password" && (
            <motion.div
              key="step-password"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
            >
              <CardHeader className="text-center">
                <Logo className="justify-center mb-4" />
                <CardTitle>Create New Password</CardTitle>
                <CardDescription>
                  Choose a strong password for your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleResetPassword} className="space-y-4" autoComplete="off">
                  <div className="space-y-1">
                    <Input
                      placeholder="New Password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground pl-1">
                      Must be at least 6 characters
                    </p>
                  </div>

                  <Input
                    placeholder="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading}
                    autoComplete="new-password"
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    variant="gradient"
                    disabled={newPassword.length < 6 || !confirmPassword || isLoading}
                  >
                    {isLoading ? "Resetting..." : "Reset Password"}
                  </Button>
                </form>

                <button
                  onClick={() => {
                    setStep("otp");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="mt-6 block mx-auto text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  Go back to verification
                </button>
              </CardContent>
            </motion.div>
          )}

        </AnimatePresence>
      </Card>
    </div>
  );
}
