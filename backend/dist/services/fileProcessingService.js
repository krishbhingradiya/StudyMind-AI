"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromFile = extractTextFromFile;
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
const tesseract_js_1 = __importDefault(require("tesseract.js"));
const officeparser_1 = require("officeparser");
const textCleaner_1 = require("../utils/textCleaner");
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
async function extractTextFromFile(buffer, mimeType, fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (PDF_TYPES.includes(mimeType) || ext === "pdf") {
        const data = await (0, pdf_parse_1.default)(buffer);
        return (0, textCleaner_1.cleanExtractedText)(data.text);
    }
    if (DOCX_TYPES.includes(mimeType) || ext === "docx" || ext === "doc") {
        const result = await mammoth_1.default.extractRawText({ buffer });
        return (0, textCleaner_1.cleanExtractedText)(result.value);
    }
    if (PPTX_TYPES.includes(mimeType) || ext === "pptx" || ext === "ppt") {
        const ast = await (0, officeparser_1.parseOffice)(buffer, {
            ignoreNotes: false,
            newlineDelimiter: "\n",
        });
        return (0, textCleaner_1.cleanExtractedText)(ast.toText());
    }
    if (IMAGE_TYPES.includes(mimeType) || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
        const { data } = await tesseract_js_1.default.recognize(buffer, "eng", {
            logger: () => { },
        });
        return (0, textCleaner_1.cleanExtractedText)(data.text);
    }
    // Plain text fallback
    if (mimeType.startsWith("text/") || ext === "txt") {
        return (0, textCleaner_1.cleanExtractedText)(buffer.toString("utf-8"));
    }
    throw new Error(`Unsupported file type: ${mimeType || ext}`);
}
//# sourceMappingURL=fileProcessingService.js.map