"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNIVERSITY_CATALOG = void 0;
exports.findUniversitySeed = findUniversitySeed;
exports.UNIVERSITY_CATALOG = [
    {
        university_name: "GTU",
        branches: ["Computer Engineering", "IT", "Mechanical", "Civil", "EC"],
        semesters: 8,
        marking_scheme: { theory: 70, practical: 25, internal: 30 },
        exam_trends: ["70-mark theory", "MCQ + descriptive mix", "unit-wise weightage", "internal + external"],
        common_subjects: {
            "Computer Engineering": ["Data Structures", "DBMS", "OS", "CN", "Software Engineering", "AI"],
            IT: ["Web Development", "Cloud Computing", "Data Mining", "Mobile Computing"],
        },
    },
    {
        university_name: "Mumbai University",
        branches: ["Computer Science", "IT", "Electronics", "Mechanical"],
        semesters: 6,
        marking_scheme: { theory: 75, practical: 50, internal: 20 },
        exam_trends: ["CBCGS grading", "80-mark papers common", "repeat questions from past papers"],
        common_subjects: {
            "Computer Science": ["DSA", "Operating Systems", "Computer Networks", "DBMS"],
        },
    },
    {
        university_name: "Delhi University",
        branches: ["B.Sc CS", "B.Com", "BA", "B.Tech"],
        semesters: 6,
        marking_scheme: { theory: 75, practical: 0, internal: 25 },
        exam_trends: ["Semester exams", "moderate difficulty", "conceptual + application"],
        common_subjects: {
            "B.Sc CS": ["Programming", "Data Structures", "Discrete Math", "DBMS"],
        },
    },
    {
        university_name: "Charusat University",
        branches: ["Computer Engineering", "IT", "CE", "EC", "Mechanical"],
        semesters: 8,
        marking_scheme: { theory: 70, practical: 30, internal: 30 },
        exam_trends: ["open book tests", "unit-wise papers", "theory + numerical mix"],
        common_subjects: {
            IT: ["DBMS", "Data Structures", "Operating Systems", "Computer Networks"],
            "Computer Engineering": ["DBMS", "DSA", "OS", "Software Engineering"],
        },
    },
    {
        university_name: "IIT",
        branches: ["CSE", "EE", "ME", "CE"],
        semesters: 8,
        marking_scheme: { theory: 100, practical: 0, internal: 0 },
        exam_trends: ["High conceptual depth", "problem-solving focus", "limited repetition"],
        common_subjects: {
            CSE: ["Algorithms", "Machine Learning", "Systems", "Theory of Computation"],
        },
    },
];
function findUniversitySeed(name) {
    const n = name.trim().toLowerCase();
    return exports.UNIVERSITY_CATALOG.find((u) => u.university_name.toLowerCase() === n ||
        u.university_name.toLowerCase().includes(n) ||
        n.includes(u.university_name.toLowerCase()));
}
//# sourceMappingURL=universityCatalog.js.map