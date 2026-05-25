/** Normalize different Supabase/PostgREST error shapes into a string message. */
function normalizeErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const err = error as Record<string, unknown>;
    if (typeof err.message === "string") return err.message;
    if (typeof err.details === "string") return err.details;
    if (typeof err.error === "string") return err.error;
    if (typeof err.toString === "function") return err.toString();
  }
  return "";
}

/** True when Supabase/PostgREST reports a missing table column. */
export function isMissingColumnError(error: unknown): boolean {
  const msg = normalizeErrorMessage(error).toLowerCase();
  return (
    (msg.includes("column") && msg.includes("does not exist")) ||
    (msg.includes("could not find") && msg.includes("column")) ||
    (msg.includes("schema cache") && msg.includes("column"))
  );
}

export function parseMissingColumns(error: unknown): string[] {
  const msg = normalizeErrorMessage(error);
  const columns = new Set<string>();

  const regex = /['"]([^'"]+)['"]\s+column|column\s+['"]([^'"]+)['"]/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(msg)) !== null) {
    const columnName = match[1] || match[2];
    if (columnName) {
      columns.add(columnName);
    }
  }

  return Array.from(columns);
}

export function removeMissingColumns<T extends Record<string, unknown>>(payload: T, missingColumns: string[]): T {
  const cleaned = { ...payload };
  for (const column of missingColumns) {
    delete cleaned[column as keyof T];
  }
  return cleaned;
}
