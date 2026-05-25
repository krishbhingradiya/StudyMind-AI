import { createClient } from "@/lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

type ApiResult<T> = { success: boolean; data?: T; error?: string; message?: string };

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retries = 0
): Promise<ApiResult<T>> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const text = await res.text();
    let parsed: ApiResult<T>;

    try {
      parsed = text ? JSON.parse(text) : { success: false, error: "Empty response from server" };
    } catch {
      return {
        success: false,
        error: res.ok ? "Invalid server response" : `Request failed (${res.status})`,
      };
    }

    if (!res.ok && parsed.success !== false) {
      parsed = {
        ...parsed,
        success: false,
        error: parsed.error || parsed.message || `Request failed (${res.status})`,
      };
    }

    if (
      !parsed.success &&
      retries < 2 &&
      res.status >= 500
    ) {
      await new Promise((r) => setTimeout(r, 800 * (retries + 1)));
      return apiRequest<T>(endpoint, options, retries + 1);
    }

    return parsed;
  } catch (err) {
    if (retries < 2) {
      await new Promise((r) => setTimeout(r, 800 * (retries + 1)));
      return apiRequest<T>(endpoint, options, retries + 1);
    }
    return { success: false, error: (err as Error).message || "Network error" };
  }
}

export const api = {
  sendOtp: (data: Record<string, unknown>) =>
    apiRequest<{ cooldownRemaining: number }>("/auth/send-otp", { method: "POST", body: JSON.stringify(data) }),
  verifyOtp: (data: Record<string, unknown>) =>
    apiRequest<any>("/auth/verify-otp", { method: "POST", body: JSON.stringify(data) }),
  resendOtp: (data: Record<string, unknown>) =>
    apiRequest<{ cooldownRemaining: number }>("/auth/resend-otp", { method: "POST", body: JSON.stringify(data) }),
  sendLoginOtp: (data: Record<string, unknown>) =>
    apiRequest<{ cooldownRemaining: number }>("/auth/send-login-otp", { method: "POST", body: JSON.stringify(data) }),
  verifyLoginOtp: (data: Record<string, unknown>) =>
    apiRequest<any>("/auth/verify-login-otp", { method: "POST", body: JSON.stringify(data) }),
  forgotPassword: (data: Record<string, unknown>) =>
    apiRequest<{ cooldownRemaining: number }>("/auth/forgot-password", { method: "POST", body: JSON.stringify(data) }),
  resetPassword: (data: Record<string, unknown>) =>
    apiRequest<any>("/auth/reset-password", { method: "POST", body: JSON.stringify(data) }),
  getProfile: () => apiRequest("/users/profile"),
  createProfile: (data: Record<string, unknown>) =>
    apiRequest("/users/profile", { method: "POST", body: JSON.stringify(data) }),
  updateProfile: (data: Record<string, unknown>) =>
    apiRequest("/users/profile", { method: "PATCH", body: JSON.stringify(data) }),

  getUploads: () => apiRequest("/uploads"),
  uploadFile: (formData: FormData) =>
    apiRequest("/uploads", { method: "POST", body: formData }),
  deleteUpload: (id: string) => apiRequest(`/uploads/${id}`, { method: "DELETE" }),

  generateSummary: (data: Record<string, unknown>) =>
    apiRequest("/summaries/generate", { method: "POST", body: JSON.stringify(data) }),
  getSummaries: () => apiRequest("/summaries"),
  getSummary: (id: string) => apiRequest(`/summaries/${id}`),

  generateQuiz: (data: Record<string, unknown>) =>
    apiRequest("/quizzes/generate", { method: "POST", body: JSON.stringify(data) }),
  submitQuiz: (data: Record<string, unknown>) =>
    apiRequest("/quizzes/submit", { method: "POST", body: JSON.stringify(data) }),
  getQuizzes: () => apiRequest("/quizzes"),
  getQuiz: (id: string) => apiRequest(`/quizzes/${id}`),
  retakeQuiz: (id: string) =>
    apiRequest(`/quizzes/${id}/retake`, { method: "POST" }),

  getWeakTopics: () => apiRequest("/weak-topics"),
  generateRoadmap: (data: Record<string, unknown>) =>
    apiRequest("/roadmaps/generate", { method: "POST", body: JSON.stringify(data) }),
  getRoadmaps: () => apiRequest("/roadmaps"),
  getRoadmap: (id: string) => apiRequest(`/roadmaps/${id}`),
  updateRoadmapProgress: (id: string, data: Record<string, unknown>) =>
    apiRequest(`/roadmaps/${id}/progress`, { method: "PATCH", body: JSON.stringify(data) }),
  prepareTaskVerification: (taskId: string) =>
    apiRequest(`/roadmaps/tasks/${taskId}/verify/prepare`, { method: "POST" }),
  submitTaskVerification: (taskId: string, data: Record<string, unknown>) =>
    apiRequest(`/roadmaps/tasks/${taskId}/verify/submit`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  uploadPaper: (formData: FormData) =>
    apiRequest("/papers/upload", { method: "POST", body: formData }),
  getPapers: () => apiRequest("/papers"),
  predictPaper: (id: string, count?: number, totalMarks?: number) =>
    apiRequest(`/papers/${id}/predict`, {
      method: "POST",
      body: JSON.stringify({ count, totalMarks }),
    }),
  predictPaperSubject: (subject: string, count?: number, totalMarks?: number) =>
    apiRequest("/papers/predict-subject", {
      method: "POST",
      body: JSON.stringify({ subject, count, totalMarks }),
    }),
  getPredictedPapersHistory: (params?: Record<string, any>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiRequest(`/papers/predictions${qs}`);
  },
  deletePredictedPaper: (id: string) =>
    apiRequest(`/papers/predictions/${id}`, { method: "DELETE" }),
  analyzeCombinedPapers: (formData: FormData) =>
    apiRequest("/papers/collections/analyze", { method: "POST", body: formData }),
  predictFromCollection: (collectionId: string, data?: { totalMarks?: number }) =>
    apiRequest(`/papers/collections/${collectionId}/predict`, { 
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),
  getCollectionsHistory: () =>
    apiRequest("/papers/collections"),
  deleteCollection: (id: string) =>
    apiRequest(`/papers/collections/${id}`, { method: "DELETE" }),

  getAnalytics: () => apiRequest("/analytics/dashboard"),

  getUniversityCatalog: () => apiRequest("/academic/universities"),
  resolveUniversity: (data: Record<string, unknown>) =>
    apiRequest("/academic/universities/resolve", { method: "POST", body: JSON.stringify(data) }),
  getAcademicContext: () => apiRequest("/academic/context"),
  getAcademicDashboard: () => apiRequest("/academic/dashboard"),
  getMaterialAnalyses: () => apiRequest("/academic/materials"),
};
