"use client";

import { useEffect } from "react";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import type { UserProfile } from "@/types";

export function useProfile() {
  const { profile, isLoading, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    if (profile) {
      setLoading(false);
      return;
    }
    api.getProfile().then((res) => {
      if (res.success && res.data) setProfile(res.data as UserProfile);
      setLoading(false);
    });
  }, [profile, setProfile, setLoading]);

  return { profile, isLoading };
}
