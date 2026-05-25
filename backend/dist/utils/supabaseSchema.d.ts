/** True when Supabase/PostgREST reports a missing table column. */
export declare function isMissingColumnError(error: unknown): boolean;
export declare function parseMissingColumns(error: unknown): string[];
export declare function removeMissingColumns<T extends Record<string, unknown>>(payload: T, missingColumns: string[]): T;
//# sourceMappingURL=supabaseSchema.d.ts.map