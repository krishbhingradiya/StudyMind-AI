"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";
import { useProfile } from "@/hooks/useProfile";
import { useAuthStore } from "@/store/authStore";

const schema = z.object({
  full_name: z.string().min(2),
  university: z.string().optional(),
  branch: z.string().optional(),
  semester: z.coerce.number().min(1).max(12).optional().or(z.literal("")),
});

type FormData = z.infer<typeof schema>;

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { profile } = useProfile();
  const setProfile = useAuthStore((state) => state.setProfile);
  const { theme, setTheme } = useTheme();
  const { register, handleSubmit, reset } = useForm<FormData>({ resolver: zodResolver(schema) });
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (profile) reset(profile);
  }, [profile, reset]);

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      semester: data.semester === "" ? undefined : data.semester,
    };
    const res = await api.updateProfile(payload);
    if (res.success && res.data) {
      setProfile(res.data as any);
      toast.success("Profile updated");
    } else {
      toast.error(res.error || "Failed to update profile");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    
    setIsUpdatingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setIsUpdatingPassword(false);

    if (error) {
      toast.error(error.message || "Failed to update password");
    } else {
      toast.success("Password updated successfully!");
      setPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <Card className="glass">
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input placeholder="Full Name" {...register("full_name")} />
            <Input placeholder="University" {...register("university")} />
            <Input placeholder="Branch" {...register("branch")} />
            <Input placeholder="Semester" type="number" {...register("semester")} />
            <Button type="submit" variant="gradient">Save Profile</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass border-destructive/20">
        <CardHeader><CardTitle>Security</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <Input 
              placeholder="New Password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input 
              placeholder="Confirm New Password" 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button type="submit" variant="outline" disabled={!password || isUpdatingPassword}>
              {isUpdatingPassword ? "Updating..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Button variant={theme === "light" ? "default" : "outline"} onClick={() => setTheme("light")}>Light</Button>
          <Button variant={theme === "dark" ? "default" : "outline"} onClick={() => setTheme("dark")}>Dark</Button>
          <Button variant={theme === "system" ? "default" : "outline"} onClick={() => setTheme("system")}>System</Button>
        </CardContent>
      </Card>
    </div>
  );
}
