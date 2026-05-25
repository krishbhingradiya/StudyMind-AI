export interface ExamQuestionPart {
    label: string;
    marks: number;
    text: string;
}
export interface ExamQuestion {
    number: string;
    marks: number;
    text: string;
    subparts?: ExamQuestionPart[];
    note?: string;
}
export interface ExamSection {
    title: string;
    sectionMarks: number;
    attemptRule: string;
    questions: ExamQuestion[];
}
export interface PredictedExamPaper {
    university: string;
    examTitle: string;
    subject: string;
    subjectCode?: string;
    branch?: string;
    semester?: string;
    examDate: string;
    durationMinutes: number;
    totalMarks: number;
    examType: string;
    instructions: string[];
    sections: ExamSection[];
    footerNote: string;
}
//# sourceMappingURL=predictedExamPaper.d.ts.map