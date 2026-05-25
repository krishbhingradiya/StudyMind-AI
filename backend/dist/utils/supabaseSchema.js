"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMissingColumnError = isMissingColumnError;
exports.parseMissingColumns = parseMissingColumns;
exports.removeMissingColumns = removeMissingColumns;
/** Normalize different Supabase/PostgREST error shapes into a string message. */
function normalizeErrorMessage(error) {
    if (!error)
        return "";
    if (typeof error === "string")
        return error;
    if (error instanceof Error)
        return error.message;
    if (typeof error === "object") {
        const err = error;
        if (typeof err.message === "string")
            return err.message;
        if (typeof err.details === "string")
            return err.details;
        if (typeof err.error === "string")
            return err.error;
        if (typeof err.toString === "function")
            return err.toString();
    }
    return "";
}
/** True when Supabase/PostgREST reports a missing table column. */
function isMissingColumnError(error) {
    const msg = normalizeErrorMessage(error).toLowerCase();
    return ((msg.includes("column") && msg.includes("does not exist")) ||
        (msg.includes("could not find") && msg.includes("column")) ||
        (msg.includes("schema cache") && msg.includes("column")));
}
function parseMissingColumns(error) {
    const msg = normalizeErrorMessage(error);
    const columns = new Set();
    const regex = /['"]([^'"]+)['"]\s+column|column\s+['"]([^'"]+)['"]/gi;
    let match;
    while ((match = regex.exec(msg)) !== null) {
        const columnName = match[1] || match[2];
        if (columnName) {
            columns.add(columnName);
        }
    }
    return Array.from(columns);
}
function removeMissingColumns(payload, missingColumns) {
    const cleaned = { ...payload };
    for (const column of missingColumns) {
        delete cleaned[column];
    }
    return cleaned;
}
//# sourceMappingURL=supabaseSchema.js.map