import { Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../config/supabase";
import { generateSummary, SummaryType } from "../services/ai/summaryService";
import { ensureUploadExtractedText } from "../services/uploadContentService";
import { sendSuccess, sendError } from "../utils/apiResponse";

const generateSchema = z.object({
  uploadId: z.string().uuid().optional(),
  content: z.string().optional(),
  title: z.string().default("AI Summary"),
  summaryType: z
    .enum(["concise", "key_points", "revision", "explanation", "simplified"])
    .default("concise"),
  targetPages: z.coerce.number().int().min(1).max(15).optional(),
});

export async function generateSummaryHandler(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) return sendError(res, parsed.error.message, 400);

    const supabase = getSupabaseAdmin();
    let content = parsed.data.content || "";
    let uploadId = parsed.data.uploadId;

    if (uploadId) {
      const extracted = await ensureUploadExtractedText(supabase, uploadId, req.user.id);
      if (!extracted) {
        return sendError(
          res,
          "Upload not found or text could not be extracted. Supported formats: PDF, DOCX, PPTX, images, TXT.",
          404
        );
      }
      content = extracted;
    }

    if (!content.trim()) return sendError(res, "No content to summarize", 400);

    const { data: profile } = await supabase
      .from("users")
      .select("university, branch, semester")
      .eq("id", req.user.id)
      .single();

    const summaryContent = await generateSummary(
      content,
      parsed.data.summaryType as SummaryType,
      {
        university: profile?.university,
        branch: profile?.branch,
        semester: profile?.semester,
        targetPages: parsed.data.targetPages,
      }
    );

    if (!summaryContent.trim()) {
      return sendError(
        res,
        "AI returned empty notes. Please try again or switch AI models in backend/.env.",
        502
      );
    }

    const { data, error } = await supabase
      .from("summaries")
      .insert({
        user_id: req.user.id,
        upload_id: uploadId || null,
        title: parsed.data.title,
        content: summaryContent,
        summary_type: parsed.data.summaryType,
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes("summaries") && error.message.includes("schema cache")) {
        return sendError(
          res,
          "Database setup required: run supabase/migrations/003_ensure_summaries.sql in your Supabase SQL Editor.",
          503
        );
      }
      return sendError(res, error.message, 500);
    }

    await supabase.from("activity_logs").insert({
      user_id: req.user.id,
      action_type: "summary_generated",
      metadata: { title: parsed.data.title },
    });

    return sendSuccess(res, data, "Summary generated", 201);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function getSummaries(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("summaries")
      .select("id, title, summary_type, created_at, upload_id")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.message.includes("summaries") && error.message.includes("schema cache")) {
        return sendError(
          res,
          "Database setup required: run supabase/migrations/003_ensure_summaries.sql in your Supabase SQL Editor.",
          503
        );
      }
      return sendError(res, error.message, 500);
    }
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function getSummaryById(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("summaries")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.user.id)
      .single();

    if (error || !data) return sendError(res, "Summary not found", 404);
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}
