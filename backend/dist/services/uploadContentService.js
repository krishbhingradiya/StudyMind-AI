"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureUploadExtractedText = ensureUploadExtractedText;
const fileProcessingService_1 = require("./fileProcessingService");
const textCleaner_1 = require("../utils/textCleaner");
const BUCKET = "study-materials";
async function ensureUploadExtractedText(supabase, uploadId, userId) {
    const { data: upload, error } = await supabase
        .from("uploads")
        .select("extracted_text, storage_path, file_type, file_name")
        .eq("id", uploadId)
        .eq("user_id", userId)
        .single();
    if (error || !upload)
        return null;
    if (upload.extracted_text?.trim()) {
        return upload.extracted_text;
    }
    const { data: fileData, error: downloadError } = await supabase.storage
        .from(BUCKET)
        .download(upload.storage_path);
    if (downloadError || !fileData) {
        console.warn("Failed to download upload for re-extraction:", downloadError);
        return null;
    }
    const buffer = Buffer.from(await fileData.arrayBuffer());
    try {
        const extractedText = await (0, fileProcessingService_1.extractTextFromFile)(buffer, upload.file_type, upload.file_name);
        if (!extractedText.trim())
            return null;
        const safeText = (0, textCleaner_1.truncateText)(extractedText);
        await supabase
            .from("uploads")
            .update({ extracted_text: safeText })
            .eq("id", uploadId)
            .eq("user_id", userId);
        return safeText;
    }
    catch (extractErr) {
        console.warn("Re-extraction failed:", extractErr);
        return null;
    }
}
//# sourceMappingURL=uploadContentService.js.map