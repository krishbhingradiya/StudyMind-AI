export function cleanExtractedText(text: string): string {
  return sanitizeForDatabase(
    text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[^\S\n]+/g, " ")
      .replace(/^\s+|\s+$/gm, "")
      .trim()
  );
}

/**
 * Prevents PostgreSQL "unsupported Unicode escape sequence" when storing
 * extracted PDF/DOCX text (LaTeX like \usepackage, broken \u escapes, null bytes).
 */
export function sanitizeForDatabase(text: string): string {
  if (!text) return "";

  return (
    text
      // Remove null bytes and lone surrogates
      .replace(/\0/g, "")
      .replace(/[\uD800-\uDFFF]/g, "")
      // Fix invalid \uXXXX (Postgres JSON/JSONB parser rejects these)
      .replace(/\\u(?![0-9a-fA-F]{4})/g, "\\\\u")
      // Fix invalid \xXX hex escapes
      .replace(/\\x(?![0-9a-fA-F]{2})/gi, "\\\\x")
      // Lone backslash at end of string
      .replace(/\\$/g, "\\\\")
  );
}

export function truncateText(text: string, maxLength = 12000): string {
  const safe = sanitizeForDatabase(text);
  if (safe.length <= maxLength) return safe;
  return safe.slice(0, maxLength) + "\n\n[Content truncated for processing...]";
}

/** Safe string for JSONB metadata fields */
export function sanitizeMetadataValue(value: string): string {
  return sanitizeForDatabase(value).slice(0, 500);
}