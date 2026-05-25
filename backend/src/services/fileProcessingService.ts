import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import Tesseract from "tesseract.js";
import { parseOffice } from "officeparser";
import { cleanExtractedText } from "../utils/textCleaner";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
const PDF_TYPES = ["application/pdf"];
const DOCX_TYPES = [
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];
const PPTX_TYPES = [
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
];

export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (PDF_TYPES.includes(mimeType) || ext === "pdf") {
    const data = await pdfParse(buffer);
    return cleanExtractedText(data.text);
  }

  if (DOCX_TYPES.includes(mimeType) || ext === "docx" || ext === "doc") {
    const result = await mammoth.extractRawText({ buffer });
    return cleanExtractedText(result.value);
  }

  if (PPTX_TYPES.includes(mimeType) || ext === "pptx" || ext === "ppt") {
    const ast = await parseOffice(buffer, {
      ignoreNotes: false,
      newlineDelimiter: "\n",
    });
    return cleanExtractedText(ast.toText());
  }

  if (IMAGE_TYPES.includes(mimeType) || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
    const { data } = await Tesseract.recognize(buffer, "eng", {
      logger: () => {},
    });
    return cleanExtractedText(data.text);
  }

  // Plain text fallback
  if (mimeType.startsWith("text/") || ext === "txt") {
    return cleanExtractedText(buffer.toString("utf-8"));
  }

  throw new Error(`Unsupported file type: ${mimeType || ext}`);
}
