export interface UniversitySeed {
    university_name: string;
    branches: string[];
    semesters: number;
    marking_scheme: {
        theory: number;
        practical: number;
        internal: number;
    };
    exam_trends: string[];
    common_subjects: Record<string, string[]>;
}
export declare const UNIVERSITY_CATALOG: UniversitySeed[];
export declare function findUniversitySeed(name: string): UniversitySeed | undefined;
//# sourceMappingURL=universityCatalog.d.ts.map