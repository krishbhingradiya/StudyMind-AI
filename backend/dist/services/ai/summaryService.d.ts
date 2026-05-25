export type SummaryType = "concise" | "key_points" | "revision" | "explanation" | "simplified";
export declare function generateSummary(content: string, type?: SummaryType, context?: {
    university?: string;
    branch?: string;
    semester?: number;
    targetPages?: number;
}): Promise<string>;
//# sourceMappingURL=summaryService.d.ts.map