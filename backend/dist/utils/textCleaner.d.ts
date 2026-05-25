export declare function cleanExtractedText(text: string): string;
/**
 * Prevents PostgreSQL "unsupported Unicode escape sequence" when storing
 * extracted PDF/DOCX text (LaTeX like \usepackage, broken \u escapes, null bytes).
 */
export declare function sanitizeForDatabase(text: string): string;
export declare function truncateText(text: string, maxLength?: number): string;
/** Safe string for JSONB metadata fields */
export declare function sanitizeMetadataValue(value: string): string;
//# sourceMappingURL=textCleaner.d.ts.map