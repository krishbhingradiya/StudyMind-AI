import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { AuthenticatedRequest } from "../middleware/auth";
import { getSupabaseAdmin } from "../config/supabase";
import { extractTextFromFile } from "../services/fileProcessingService";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { isMissingColumnError } from "../utils/supabaseSchema";

const UPLOAD_LIST_SELECT_EXTENDED =
  "id, file_name, file_type, file_size, subject, material_type, university, uploaded_at, analysis_id";
const UPLOAD_LIST_SELECT_LEGACY =
  "id, file_name, file_type, file_size, subject, uploaded_at";
import { truncateText, sanitizeMetadataValue } from "../utils/textCleaner";
import { scheduleUploadAnalysis } from "../services/academic/backgroundAnalysis";
import type { MaterialType } from "../services/academic/materialAnalysisService";

const BUCKET = "study-materials";

export async function uploadFile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user || !req.file) {
      return sendError(res, "No file provided", 400);
    }

    const supabase = getSupabaseAdmin();
    const fileId = uuidv4();
    const ext = req.file.originalname.split(".").pop() || "bin";
    const storagePath = `${req.user.id}/${fileId}.${ext}`;

    const [storageResult, extractedTextRaw] = await Promise.all([
      supabase.storage.from(BUCKET).upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      }),
      extractTextFromFile(req.file.buffer, req.file.mimetype, req.file.originalname).catch(
        (extractErr) => {
          console.warn("Text extraction failed:", extractErr);
          return "";
        }
      ),
    ]);

    if (storageResult.error) {
      return sendError(res, `Storage upload failed: ${storageResult.error.message}`, 500);
    }

    const extractedText = extractedTextRaw
      ? truncateText(extractedTextRaw, 20000)
      : "";

    const body = req.body as {
      subject?: string;
      materialType?: MaterialType;
      university?: string;
      branch?: string;
      semester?: string;
    };
    const fileName = sanitizeMetadataValue(req.file.originalname);
    const subject = body.subject ? sanitizeMetadataValue(body.subject) : null;
    const materialType = (body.materialType || "notes") as MaterialType;

    const insertPayload: Record<string, unknown> = {
      user_id: req.user.id,
      file_name: fileName || req.file.originalname,
      file_type: req.file.mimetype,
      storage_path: storagePath,
      file_size: req.file.size,
      extracted_text: extractedText || null,
      subject,
      material_type: materialType,
      university: body.university ? sanitizeMetadataValue(body.university) : null,
      branch: body.branch ? sanitizeMetadataValue(body.branch) : null,
      semester: body.semester ? parseInt(body.semester, 10) : null,
    };

    const legacyPayload: Record<string, unknown> = {
      user_id: insertPayload.user_id,
      file_name: insertPayload.file_name,
      file_type: insertPayload.file_type,
      storage_path: insertPayload.storage_path,
      file_size: insertPayload.file_size,
      extracted_text: insertPayload.extracted_text,
      subject: insertPayload.subject,
    };

    let payload: Record<string, unknown> = insertPayload;
    let { data, error } = await supabase.from("uploads").insert(payload).select().single();

    if (error && isMissingColumnError(error)) {
      payload = legacyPayload;
      ({ data, error } = await supabase.from("uploads").insert(payload).select().single());
    }

    // Fallback: save file without extracted text if JSON/escape errors persist
    if (
      error &&
      (error.message.includes("Unicode escape") ||
        error.message.includes("escape sequence"))
    ) {
      ({ data, error } = await supabase
        .from("uploads")
        .insert({ ...payload, extracted_text: null })
        .select()
        .single());
    }

    if (error) return sendError(res, error.message, 500);

    await supabase.from("activity_logs").insert({
      user_id: req.user.id,
      action_type: "upload",
      metadata: { file_name: fileName || req.file.originalname, material_type: materialType },
    });

    const hasText = Boolean(extractedText?.trim());
    if (hasText) {
      scheduleUploadAnalysis(supabase, req.user.id, {
        uploadId: data.id,
        extractedText,
        fileName: fileName || req.file.originalname,
        materialType,
        university: body.university,
        branch: body.branch,
        semester: body.semester ? parseInt(body.semester, 10) : undefined,
        subject: subject || undefined,
      });
    }

    return sendSuccess(
      res,
      { ...data, analysis: null, analysisPending: hasText },
      hasText
        ? "File uploaded — AI analysis running in the background"
        : "File uploaded successfully",
      201
    );
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function getUploads(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const supabase = getSupabaseAdmin();
    let { data, error } = await supabase
      .from("uploads")
      .select(UPLOAD_LIST_SELECT_EXTENDED)
      .eq("user_id", req.user.id)
      .order("uploaded_at", { ascending: false });

    if (error && isMissingColumnError(error)) {
  const legacyResponse: any = await supabase
    .from("uploads")
    .select(UPLOAD_LIST_SELECT_LEGACY)
    .eq("user_id", req.user.id)
    .order("uploaded_at", { ascending: false });

  data = legacyResponse.data;
  error = legacyResponse.error;
}

    if (error) return sendError(res, error.message, 500);
    return sendSuccess(res, data);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}

export async function deleteUpload(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);

    const { id } = req.params;
    const supabase = getSupabaseAdmin();

    const { data: upload } = await supabase
      .from("uploads")
      .select("storage_path")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .single();

    if (!upload) return sendError(res, "Upload not found", 404);

    await supabase.storage.from(BUCKET).remove([upload.storage_path]);
    await supabase.from("uploads").delete().eq("id", id);

    return sendSuccess(res, null, "Upload deleted");
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
}
