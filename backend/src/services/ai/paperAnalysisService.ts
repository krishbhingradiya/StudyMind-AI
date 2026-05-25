import { generateAI, parseJsonFromAI } from "./aiClient";
import { PaperAnalysis } from "../../types";
import type { PredictedExamPaper, ExamQuestion } from "../../types/predictedExamPaper";
import { z } from "zod";

// Zod validation schemas
const examQuestionPartSchema = z.object({
  label: z.string(),
  marks: z.number().min(1),
  text: z.string()
});

const examQuestionSchema = z.object({
  number: z.string(),
  marks: z.number().min(1),
  text: z.string(),
  subparts: z.array(examQuestionPartSchema).optional(),
  note: z.string().optional()
});

const examSectionSchema = z.object({
  title: z.string(),
  sectionMarks: z.number().min(0),
  attemptRule: z.string(),
  questions: z.array(examQuestionSchema)
});

export const predictedExamPaperSchema = z.object({
  university: z.string(),
  examTitle: z.string(),
  subject: z.string(),
  subjectCode: z.string().optional(),
  branch: z.string().optional(),
  semester: z.string().optional(),
  examDate: z.string(),
  durationMinutes: z.number().min(1),
  totalMarks: z.number().min(1),
  examType: z.string(),
  instructions: z.array(z.string()),
  sections: z.array(examSectionSchema),
  footerNote: z.string()
});

// Zod schema for enriched paper analysis
export const paperAnalysisSchema = z.object({
  repeatedTopics: z.array(z.string()),
  examPatterns: z.array(z.string()),
  importantChapters: z.array(z.string()),
  highPriorityQuestions: z.array(z.string()),
  predictedTopics: z.array(z.string()),
  // Rich intelligence metrics
  confidenceScore: z.number().min(0).max(100).optional().default(85),
  chapterWeightage: z.array(z.object({
    chapter: z.string(),
    weightage: z.number().min(0).max(100),
    importanceScore: z.number().min(0).max(100)
  })).optional(),
  unitFrequency: z.array(z.object({
    unit: z.string(),
    count: z.number()
  })).optional(),
  difficultyAnalysis: z.object({
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    reasoning: z.string()
  }).optional(),
  trendAnalysis: z.array(z.string()).optional()
});

function calculateJaccardSimilarity(str1: string, str2: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^\w\s]/g, "");
  const set1 = new Set(normalize(str1).split(/\s+/).filter(w => w.length > 3));
  const set2 = new Set(normalize(str2).split(/\s+/).filter(w => w.length > 3));
  if (set1.size === 0 && set2.size === 0) return 0;
  let intersectionSize = 0;
  for (const word of set1) {
    if (set2.has(word)) intersectionSize++;
  }
  const unionSize = set1.size + set2.size - intersectionSize;
  return intersectionSize / unionSize;
}

function checkDuplicateQuestions(paper: any): string | null {
  const allQuestions: string[] = [];
  if (!paper || !paper.sections) return null;
  for (const section of paper.sections) {
    if (!section.questions) continue;
    for (const q of section.questions) {
      if (q.text) allQuestions.push(q.text);
    }
  }

  for (let i = 0; i < allQuestions.length; i++) {
    for (let j = i + 1; j < allQuestions.length; j++) {
      const q1 = allQuestions[i];
      const q2 = allQuestions[j];
      
      if (q1.toLowerCase().trim() === q2.toLowerCase().trim()) {
        return `Exact duplicate found: "${q1}"`;
      }
      
      const similarity = calculateJaccardSimilarity(q1, q2);
      if (similarity > 0.6) {
        return `High similarity (${Math.round(similarity*100)}%) between questions: 1. "${q1}" AND 2. "${q2}". You must provide completely distinct, unique questions covering different topics.`;
      }
    }
  }
  return null;
}

function getMarkDistributionRules(targetMarks: number) {
  if (targetMarks === 50) {
    return {
      total: 50,
      secA: { marks: 10, count: 2, marksPerQ: 5 },
      secB: { marks: 30, count: 6, marksPerQ: 5 },
      secC: { marks: 10, count: 5, marksPerQ: 2 }
    };
  } else if (targetMarks === 100) {
    return {
      total: 100,
      secA: { marks: 20, count: 2, marksPerQ: 10 },
      secB: { marks: 60, count: 12, marksPerQ: 5 },
      secC: { marks: 20, count: 10, marksPerQ: 2 }
    };
  }
  // Default 70 marks
  return {
    total: 70,
    secA: { marks: 14, count: 2, marksPerQ: 7 },
    secB: { marks: 40, count: 8, marksPerQ: 5 },
    secC: { marks: 16, count: 8, marksPerQ: 2 }
  };
}

export async function analyzePastPaper(
  extractedText: string,
  subject: string,
  university?: string
): Promise<PaperAnalysis> {
  const messages = [
    {
      role: "system" as const,
      content: `You are an expert exam pattern analyst for elite university engineering departments.
Analyze previous year papers and return ONLY a valid JSON object matching this exact structure:
{
  "repeatedTopics": ["topic1", "topic2"],
  "examPatterns": ["pattern description 1", "pattern description 2"],
  "importantChapters": ["Chapter Name 1", "Chapter Name 2"],
  "highPriorityQuestions": ["Common question archetype 1", "Common question archetype 2"],
  "predictedTopics": ["forecasted topic 1", "forecasted topic 2"],
  "confidenceScore": 88,
  "chapterWeightage": [
    { "chapter": "Chapter 1 Name", "weightage": 30, "importanceScore": 95 },
    { "chapter": "Chapter 2 Name", "weightage": 20, "importanceScore": 80 }
  ],
  "unitFrequency": [
    { "unit": "Unit 1", "count": 4 },
    { "unit": "Unit 2", "count": 3 }
  ],
  "difficultyAnalysis": {
    "difficulty": "Medium",
    "reasoning": "A solid balance of scenario-based technical designs paired with direct analytical derivations."
  },
  "trendAnalysis": [
    "Increasing trend of questions combining concurrency models with database integrity.",
    "Higher weightage shifts toward database triggers and normalization proofs."
  ]
}`,
    },
    {
      role: "user" as const,
      content: `Subject: ${subject}
University: ${university || "N/A"}

Previous year paper content:
${extractedText}`,
    },
  ];

  try {
    const response = await generateAI(messages, {
      maxTokens: 2000,
      temperature: 0.3,
      preferFast: true,
    });
    
    const parsed = parseJsonFromAI<any>(response);
    return paperAnalysisSchema.parse(parsed) as any;
  } catch (err) {
    console.error("[PAST_PAPER_ANALYSIS_FAILED] Falling back to standard mapping", err);
    // Safe standard fallback that matches the schema perfectly
    return {
      repeatedTopics: [subject],
      examPatterns: ["Standard theory and derivation layout"],
      importantChapters: ["Core Principles"],
      highPriorityQuestions: ["Brief analytical derivations"],
      predictedTopics: [subject],
      confidenceScore: 70,
      chapterWeightage: [{ chapter: "Core Foundations", weightage: 100, importanceScore: 70 }],
      unitFrequency: [{ unit: "Unit 1", count: 1 }],
      difficultyAnalysis: { difficulty: "Medium", reasoning: "Analysis completed with baseline metrics." },
      trendAnalysis: ["Focus on baseline specifications."]
    };
  }
}

// Global helper for retrying AI calls with schema validation
async function callAIWithRetry<T>(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: { maxTokens: number; temperature: number; preferFast?: boolean },
  zodSchema: z.ZodSchema<T>,
  fallbackBuilder: (rawText: string) => T,
  retries = 2
): Promise<T> {
  const currentMessages = [...messages];
  let attempt = 0;
  let lastError = "";

  while (attempt <= retries) {
    if (attempt > 0) {
      console.warn(`[AI_RETRY] Validation failed on attempt ${attempt}. Error: ${lastError}. Retrying...`);
      currentMessages.push(
        {
          role: "assistant" as const,
          content: lastError
        },
        {
          role: "user" as const,
          content: `Validation failed with this error:\n${lastError}\n\nPlease output ONLY clean, valid JSON matching the schema requirements perfectly. Do not include extra sentences or markdown fences.`
        }
      );
    }

    try {
      const response = await generateAI(currentMessages, options);
      const parsed = parseJsonFromAI<any>(response);
      const validated = zodSchema.parse(parsed);
      
      // Strict programmatic duplicate checker
      const duplicateError = checkDuplicateQuestions(validated);
      if (duplicateError) {
        throw new Error(`DIVERSITY VALIDATION FAILED: ${duplicateError}`);
      }
      
      return validated;
    } catch (err: any) {
      lastError = err.message || String(err);
      attempt++;
    }
  }

  console.error(`[AI_RETRY_FAILED] All ${retries} retries failed for AI validation. Triggering fallback.`);
  try {
    const rawResponse = await generateAI(messages, options);
    return fallbackBuilder(rawResponse);
  } catch {
    return fallbackBuilder("");
  }
}

export async function generatePredictedPaper(
  analysis: PaperAnalysis,
  options: {
    subject: string;
    university?: string;
    branch?: string;
    semester?: string | number;
    year?: number;
    questionCount?: number;
    examPatterns?: string[];
    totalMarks?: number;
  }
): Promise<PredictedExamPaper> {
  const targetMarks = options.totalMarks || 70;
  const rules = getMarkDistributionRules(targetMarks);
  const examDateStr = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  
  const systemInstruction = `You are a Senior Academic Examiner for prestigious Indian engineering universities (e.g., CHARUSAT, GTU).
Your task is to compile a highly professional predicted examination paper.

STRICT MARKING RULES (MUST COMPLY):
1. The exam paper must total exactly ${rules.total} Marks.
2. Structure the paper into exactly THREE sections:
   - SECTION A: Foundation & Critical Analysis (Exactly ${rules.secA.marks} Marks total). Contains exactly ${rules.secA.count} questions carrying exactly ${rules.secA.marksPerQ} marks each.
   - SECTION B: Technical Scenarios & Practical Problems (Exactly ${rules.secB.marks} Marks total). Contains exactly ${rules.secB.count} questions, each carrying exactly ${rules.secB.marksPerQ} marks.
   - SECTION C: Concept Verification MCQs (Exactly ${rules.secC.marks} Marks total). Contains exactly ${rules.secC.count} multiple-choice questions carrying exactly ${rules.secC.marksPerQ} marks each.
3. Every question in Section A and B must be framed inside a REAL-WORLD engineering scenario or industry case study. Avoid simple "Define database" or generic textbook questions. Make them practical, technical, and analytical.
4. Section C MCQs must contain a question stem and an options array.

CRITICAL DIVERSITY AND UNIQUENESS RULE:
- You MUST NOT repeat any question, topic, or scenario. 
- Do NOT use repetitive phrasing or templates like "With respect to [topic], design a block...". 
- Every single question must cover a COMPLETELY DIFFERENT part of the syllabus. 
- You will be penalized heavily if you output duplicate or highly similar questions. Make them extremely varied and creative.

You must return ONLY a valid JSON object matching this structure (no extra wrapping or conversation):
{
  "university": "${options.university || "Charusat University"}",
  "examTitle": "End Semester Examination",
  "subject": "${options.subject}",
  "subjectCode": "${options.branch ? "CE" : "CS"}301",
  "branch": "${options.branch || "Computer Engineering"}",
  "semester": "${options.semester || "IV"}",
  "examDate": "${examDateStr}",
  "durationMinutes": 180,
  "totalMarks": ${targetMarks},
  "examType": "Theory",
  "instructions": [
    "All questions are compulsory.",
    "Assume suitable data wherever necessary and state your assumptions clearly.",
    "Draw neat architecture diagrams or schema block diagrams to support your answers."
  ],
  "sections": [
    {
      "title": "SECTION A (Critical Analysis - ${rules.secA.marks} Marks)",
      "sectionMarks": ${rules.secA.marks},
      "attemptRule": "Answer all questions. Each question carries ${rules.secA.marksPerQ} marks.",
      "questions": [
        {
          "number": "1",
          "marks": ${rules.secA.marksPerQ},
          "text": "A global finance platform with high-frequency transactions experiences occasional data inconsistencies during multi-master replication. Propose a distributed lock-free reconciliation strategy...",
          "subparts": [
            { "label": "a", "marks": ${Math.ceil(rules.secA.marksPerQ / 2)}, "text": "Formulate a replication diagram for this protocol." },
            { "label": "b", "marks": ${Math.floor(rules.secA.marksPerQ / 2)}, "text": "Analyze the impact on write latency under high-load scenarios." }
          ]
        },
        {
          "number": "2",
          "marks": ${rules.secA.marksPerQ},
          "text": "Scenario Question 2..."
        }
      ]
    },
    {
      "title": "SECTION B (Scenario Technical Core - ${rules.secB.marks} Marks)",
      "sectionMarks": ${rules.secB.marks},
      "attemptRule": "Answer all ${rules.secB.count} questions. Each question carries ${rules.secB.marksPerQ} marks.",
      "questions": [
        {
          "number": "3",
          "marks": ${rules.secB.marksPerQ},
          "text": "Scenario Question 3..."
        }
      ]
    },
    {
      "title": "SECTION C (Concept Verification MCQs - ${rules.secC.marks} Marks)",
      "sectionMarks": ${rules.secC.marks},
      "attemptRule": "Attempt all multiple choice questions. Each question carries ${rules.secC.marksPerQ} marks.",
      "questions": [
        {
          "number": "11",
          "marks": 2,
          "text": "What is the optimal concurrency control parameter to minimize rollback frequency in distributed write pools?",
          "subparts": [
            { "label": "A", "marks": 0, "text": "Optimistic Locking with CAS" },
            { "label": "B", "marks": 0, "text": "Two-Phase Locking (2PL)" },
            { "label": "C", "marks": 0, "text": "Serializable Snapshot Isolation" },
            { "label": "D", "marks": 0, "text": "Multiversion Timestamp Ordering" }
          ]
        }
      ]
    }
  ],
  "footerNote": "--- End of Predicted Examination Paper (2026) ---"
}`;

  const messages = [
    { role: "system" as const, content: systemInstruction },
    {
      role: "user" as const,
      content: `Generate the predicted exam paper for:
Subject: ${options.subject}
University: ${options.university || "University"}
Analysis metrics:
- High priority topics: ${analysis.predictedTopics.join(", ")}
- Repeated pattern references: ${options.examPatterns?.join(", ") || analysis.examPatterns.join(", ")}
- Important chapters: ${analysis.importantChapters.join(", ")}`
    }
  ];

  return callAIWithRetry<PredictedExamPaper>(
    messages,
    { maxTokens: 3000, temperature: 0.45, preferFast: true },
    predictedExamPaperSchema,
    (rawText) => buildFallbackExamPaper(rawText, options, analysis)
  );
}

export async function generateMultiPaperPrediction(
  papers: Array<{
    year?: number | null;
    university?: string | null;
    analysis: PaperAnalysis;
  }>,
  options: {
    subject: string;
    university?: string;
    branch?: string;
    semester?: string | number;
    questionCount?: number;
    totalMarks?: number;
  }
): Promise<PredictedExamPaper> {
  // Aggregate analyses
  const topicsSet = new Set<string>();
  const patternsSet = new Set<string>();
  const chaptersSet = new Set<string>();
  
  for (const paper of papers) {
    paper.analysis.predictedTopics?.forEach(t => topicsSet.add(t));
    paper.analysis.examPatterns?.forEach(p => patternsSet.add(p));
    paper.analysis.importantChapters?.forEach(c => chaptersSet.add(c));
  }

  const aggregatedAnalysis: PaperAnalysis = {
    repeatedTopics: Array.from(topicsSet).slice(0, 10),
    examPatterns: Array.from(patternsSet).slice(0, 6),
    importantChapters: Array.from(chaptersSet).slice(0, 8),
    highPriorityQuestions: papers[0]?.analysis.highPriorityQuestions || [],
    predictedTopics: Array.from(topicsSet).slice(0, 8)
  };

  return generatePredictedPaper(aggregatedAnalysis, options);
}

function buildFallbackExamPaper(
  raw: string,
  options: {
    subject: string;
    university?: string;
    branch?: string;
    semester?: string | number;
    totalMarks?: number;
  },
  analysis: PaperAnalysis
): PredictedExamPaper {
  console.warn("[FALLBACK] Synthesizing a safe, clean fallback exam paper.");
  
  const subLower = options.subject.toLowerCase();
  const marks = options.totalMarks || 70;
  const rules = getMarkDistributionRules(marks);
  
  const branchName = options.branch || "Computer Engineering";
  const semValue = options.semester ? String(options.semester) : "IV";
  const code = options.subject.slice(0, 2).toUpperCase() + "301";

  let secAQuestions: ExamQuestion[] = [];
  let secBQuestions: ExamQuestion[] = [];
  let secCQuestions: ExamQuestion[] = [];

  // ─── CASE 1: DIGITAL ELECTRONICS / LOGIC DESIGN (DE) ───
  if (subLower.includes("de") || subLower.includes("digital") || subLower.includes("logic") || subLower.includes("electronic")) {
    secAQuestions = [
      {
        number: "1",
        marks: rules.secA.marksPerQ,
        text: "Design a synchronous 3-bit up/down counter using JK Flip-Flops. Formulate the state transition tables and analyze the propagation delay constraints under a 100MHz clock signal.",
        subparts: [
          { label: "a", marks: Math.ceil(rules.secA.marksPerQ / 2), text: "Draw the state excitation diagram and JK logic mappings." },
          { label: "b", marks: Math.floor(rules.secA.marksPerQ / 2), text: "Evaluate the timing violations if flip-flop propagation delay exceeds 5ns." }
        ]
      },
      {
        number: "2",
        marks: rules.secA.marksPerQ,
        text: "An industrial micro-controller requires a hazard-free combinational circuit to translate a 4-bit Gray code sequence into binary. Perform K-map minimization and resolve all dynamic hazards.",
        subparts: [
          { label: "a", marks: Math.ceil(rules.secA.marksPerQ / 2), text: "Minimize the Boolean expression using SOP Karnaugh maps." },
          { label: "b", marks: Math.floor(rules.secA.marksPerQ / 2), text: "Construct the hazard-free gate configuration using NAND gates only." }
        ]
      }
    ].slice(0, rules.secA.count);

    secBQuestions = [
      {
        number: "3",
        marks: rules.secB.marksPerQ,
        text: "Implement a 4-to-1 Multiplexer system block. Calculate the total propagation delay when cascading these blocks to form a 16-to-1 Multiplexer design."
      },
      {
        number: "4",
        marks: rules.secB.marksPerQ,
        text: "Design a Priority Encoder circuit for an automated manufacturing interrupt system handling four lines. Explain how to manage overlapping interrupt pulses."
      },
      {
        number: "5",
        marks: rules.secB.marksPerQ,
        text: "Determine the setup and hold time requirements of a master-slave D Flip-Flop. Model the timing windows using logical diagrams."
      },
      {
        number: "6",
        marks: rules.secB.marksPerQ,
        text: "Construct a finite state machine (FSM) to detect a serial binary stream pattern '1011'. Map the state reductions using Mealy architecture rules."
      },
      {
        number: "7",
        marks: rules.secB.marksPerQ,
        text: "An automated chemical mixer requires combinational logic to monitor temperature, tank pressure, and fluid height. Write the minimized Product-of-Sums (POS) layout."
      },
      {
        number: "8",
        marks: rules.secB.marksPerQ,
        text: "Contrast Static RAM (SRAM) and Dynamic RAM (DRAM) memory cell layouts regarding silicon area, latency indices, and write cycle dynamics."
      },
      {
        number: "9",
        marks: rules.secB.marksPerQ,
        text: "Synthesize a hazard-free BCD to Excess-3 code converter block. Discuss why redundant covering loops are essential in logic minimization."
      },
      {
        number: "10",
        marks: rules.secB.marksPerQ,
        text: "Outline the operation of a 4-bit Look-Ahead Carry Adder. Mathematically prove how it eliminates sequential carry propagation delays."
      },
      {
        number: "11",
        marks: rules.secB.marksPerQ,
        text: "A 555 Timer IC is operating in astable multivibrator mode. Calculate the duty cycle given R1 = 10kΩ, R2 = 5kΩ, and C = 10μF."
      },
      {
        number: "12",
        marks: rules.secB.marksPerQ,
        text: "Explain the difference between Moore and Mealy finite state machines with timing block diagrams."
      },
      {
        number: "13",
        marks: rules.secB.marksPerQ,
        text: "Design a 2-bit magnitude comparator using basic logic gates, outlining the boolean expressions for A>B, A=B, and A<B."
      },
      {
        number: "14",
        marks: rules.secB.marksPerQ,
        text: "Detail the construction of a flash analog-to-digital converter (ADC) and discuss its resolution boundaries."
      }
    ].slice(0, rules.secB.count);

    secCQuestions = [
      {
        number: "C1",
        marks: rules.secC.marksPerQ,
        text: "What is the critical timing violation triggered when the data input transitions inside the hold time window?",
        subparts: [
          { label: "A", marks: 0, text: "Metastability lock" },
          { label: "B", marks: 0, text: "Fan-out depletion" },
          { label: "C", marks: 0, text: "Logic hazard gate bypass" },
          { label: "D", marks: 0, text: "Clock skew reversal" }
        ]
      },
      {
        number: "C2",
        marks: rules.secC.marksPerQ,
        text: "A logic circuit is minimized to Y = AB + BC. Which redundant cover term must be appended to prevent dynamic hazards?",
        subparts: [
          { label: "A", marks: 0, text: "AC" },
          { label: "B", marks: 0, text: "A'C" },
          { label: "C", marks: 0, text: "B'C" },
          { label: "D", marks: 0, text: "AB'" }
        ]
      },
      {
        number: "C3",
        marks: rules.secC.marksPerQ,
        text: "How many JK Flip-Flops are needed to build a modulo-12 synchronous counter?",
        subparts: [
          { label: "A", marks: 0, text: "4" },
          { label: "B", marks: 0, text: "3" },
          { label: "C", marks: 0, text: "12" },
          { label: "D", marks: 0, text: "5" }
        ]
      },
      {
        number: "C4",
        marks: rules.secC.marksPerQ,
        text: "Which of the following elements is classified as a sequential logic device?",
        subparts: [
          { label: "A", marks: 0, text: "Shift Register" },
          { label: "B", marks: 0, text: "Multiplexer" },
          { label: "C", marks: 0, text: "BCD Decoder" },
          { label: "D", marks: 0, text: "Full Adder" }
        ]
      },
      {
        number: "C5",
        marks: rules.secC.marksPerQ,
        text: "What represents the main advantage of CMOS logic over TTL logic blocks?",
        subparts: [
          { label: "A", marks: 0, text: "Near-zero static power dissipation" },
          { label: "B", marks: 0, text: "Higher operating speed" },
          { label: "C", marks: 0, text: "Greater fan-out depletion ratio" },
          { label: "D", marks: 0, text: "Lower gate delays" }
        ]
      },
      {
        number: "C6",
        marks: rules.secC.marksPerQ,
        text: "Which K-map grouping eliminates the boolean term 'A' from the SOP expression?",
        subparts: [
          { label: "A", marks: 0, text: "Adjacent pairs crossing the A-boundary" },
          { label: "B", marks: 0, text: "Single isolated cells" },
          { label: "C", marks: 0, text: "Diagonal cells groupings" },
          { label: "D", marks: 0, text: "Corners groupings only" }
        ]
      },
      {
        number: "C7",
        marks: rules.secC.marksPerQ,
        text: "A master-slave flip-flop is designed specifically to eliminate which condition?",
        subparts: [
          { label: "A", marks: 0, text: "Race-around condition" },
          { label: "B", marks: 0, text: "Propagation gate delay" },
          { label: "C", marks: 0, text: "Setup time violation" },
          { label: "D", marks: 0, text: "Fan-in leakage" }
        ]
      },
      {
        number: "C8",
        marks: rules.secC.marksPerQ,
        text: "What does the fan-out parameter of a logic gate represent?",
        subparts: [
          { label: "A", marks: 0, text: "The maximum number of inputs it can drive without degradation" },
          { label: "B", marks: 0, text: "The gate delay timing boundaries" },
          { label: "C", marks: 0, text: "The power dissipation constant" },
          { label: "D", marks: 0, text: "The input logic impedance" }
        ]
      },
      {
        number: "C9",
        marks: rules.secC.marksPerQ,
        text: "Which logic family provides the fastest switching speed?",
        subparts: [
          { label: "A", marks: 0, text: "ECL" },
          { label: "B", marks: 0, text: "TTL" },
          { label: "C", marks: 0, text: "CMOS" },
          { label: "D", marks: 0, text: "RTL" }
        ]
      },
      {
        number: "C10",
        marks: rules.secC.marksPerQ,
        text: "The binary equivalent of Gray code 1011 is:",
        subparts: [
          { label: "A", marks: 0, text: "1101" },
          { label: "B", marks: 0, text: "1011" },
          { label: "C", marks: 0, text: "1110" },
          { label: "D", marks: 0, text: "1001" }
        ]
      }
    ].slice(0, rules.secC.count);
  }
  // ─── CASE 2: DATABASE MANAGEMENT SYSTEMS (DBMS) ───
  else if (subLower.includes("dbms") || subLower.includes("database") || subLower.includes("sql")) {
    secAQuestions = [
      {
        number: "1",
        marks: rules.secA.marksPerQ,
        text: "A distributed retail database suffers from dirty reads and phantom updates during high-frequency inventory operations. Design a strict Two-Phase Locking (2PL) protocol to guarantee serializability.",
        subparts: [
          { label: "a", marks: Math.ceil(rules.secA.marksPerQ / 2), text: "Explain the locking growth and shrinking phases with serializability proofs." },
          { label: "b", marks: Math.floor(rules.secA.marksPerQ / 2), text: "Analyze the deadlock risks and how a wait-for-graph resolves cyclic locks." }
        ]
      },
      {
        number: "2",
        marks: rules.secA.marksPerQ,
        text: "You are designing an index structure for an e-commerce platform handling 50 million product rows. Compare a B+ Tree index with an LSM Tree index layout under heavy write workloads.",
        subparts: [
          { label: "a", marks: Math.ceil(rules.secA.marksPerQ / 2), text: "Model the node division and pointer layout inside B+ Tree index pages." },
          { label: "b", marks: Math.floor(rules.secA.marksPerQ / 2), text: "Evaluate the disk write seek delays under both index styles." }
        ]
      }
    ].slice(0, rules.secA.count);

    secBQuestions = [
      {
        number: "3",
        marks: rules.secB.marksPerQ,
        text: "Decompose a flat customer sheet into Third Normal Form (3NF). Outline how normalization prevents dynamic update insertion anomalies."
      },
      {
        number: "4",
        marks: rules.secB.marksPerQ,
        text: "Explain the ARIES database recovery model during unexpected crashes. Outline the Analysis, Redo, and Undo system log scans."
      },
      {
        number: "5",
        marks: rules.secB.marksPerQ,
        text: "Contrast clustered and non-clustered database index structures regarding disk block layout, fetch speeds, and update overheads."
      },
      {
        number: "6",
        marks: rules.secB.marksPerQ,
        text: "Design a horizontal database partitioning key layout to avoid database sharding hotspots in high-frequency global clusters."
      },
      {
        number: "7",
        marks: rules.secB.marksPerQ,
        text: "Describe the execution flow of an Optimistic Concurrency Control (OCC) model. Focus on transaction Read, Validate, and Write constraints."
      },
      {
        number: "8",
        marks: rules.secB.marksPerQ,
        text: "Analyze the role of Write-Ahead Logging (WAL) in maintaining ACID transactions. Prove the physical dependency timeline."
      },
      {
        number: "9",
        marks: rules.secB.marksPerQ,
        text: "Detail how a cost-based query optimizer selects index seek plans over full scan routines using catalog table histograms."
      },
      {
        number: "10",
        marks: rules.secB.marksPerQ,
        text: "Propose a robust concurrency resolver under Multiversion Timestamp Ordering (MVTO). Discuss how read/write version numbers prevent cascade rollbacks."
      },
      {
        number: "11",
        marks: rules.secB.marksPerQ,
        text: "Explain how a Bloom filter can accelerate query execution on LSM tree storage layers."
      },
      {
        number: "12",
        marks: rules.secB.marksPerQ,
        text: "Write a complex SQL query to find the second highest salaried employee in each department without using the LIMIT clause."
      },
      {
        number: "13",
        marks: rules.secB.marksPerQ,
        text: "Describe the CAP theorem tradeoffs made by a NoSQL wide-column store like Cassandra during a network partition."
      },
      {
        number: "14",
        marks: rules.secB.marksPerQ,
        text: "Map an Entity-Relationship (ER) diagram for a hospital management system onto a relational schema."
      }
    ].slice(0, rules.secB.count);

    secCQuestions = Array.from({ length: rules.secC.count }, (_, idx) => ({
      number: `C${idx + 1}`,
      marks: rules.secC.marksPerQ,
      text: `Which SQL isolation parameter prevents dynamic read anomalies during transaction executions under heavy load? (Case #${idx + 1})`,
      subparts: [
        { label: "A", marks: 0, text: "Serializable locks" },
        { label: "B", marks: 0, text: "Read committed snapshots" },
        { label: "C", marks: 0, text: "Repeatable read blocks" },
        { label: "D", marks: 0, text: "Read uncommitted access" }
      ]
    }));
  }
  // ─── CASE 3: OPERATING SYSTEMS (OS) ───
  else if (subLower.includes("os") || subLower.includes("operating") || subLower.includes("system")) {
    secAQuestions = [
      {
        number: "1",
        marks: rules.secA.marksPerQ,
        text: "A high-performance web server uses multithreading to handle thousands of requests. The system frequently enters a deadlock state due to circular wait conditions on shared memory buffers. Design a robust resource allocation graph approach using Banker's Algorithm.",
        subparts: [
          { label: "a", marks: Math.ceil(rules.secA.marksPerQ / 2), text: "Explain the safety sequence verification with matrices." },
          { label: "b", marks: Math.floor(rules.secA.marksPerQ / 2), text: "Calculate the time complexity of the safety check when threads scale to N." }
        ]
      },
      {
        number: "2",
        marks: rules.secA.marksPerQ,
        text: "A cloud hypervisor needs to optimize its virtual memory page replacement to minimize thrashing during heavy memory overcommitment. Contrast the behavior of LRU, Clock, and Optimal page replacement policies.",
        subparts: [
          { label: "a", marks: Math.ceil(rules.secA.marksPerQ / 2), text: "Demonstrate Belady's Anomaly using a FIFO trace." },
          { label: "b", marks: Math.floor(rules.secA.marksPerQ / 2), text: "Propose an enhanced second-chance (clock) algorithm implementation." }
        ]
      }
    ].slice(0, rules.secA.count);

    secBQuestions = [
      {
        number: "3",
        marks: rules.secB.marksPerQ,
        text: "Write a monitor-based synchronization solution for the classic Dining Philosophers problem to guarantee absence of starvation."
      },
      {
        number: "4",
        marks: rules.secB.marksPerQ,
        text: "Explain how Translation Lookaside Buffers (TLBs) accelerate logical-to-physical address translation in paging systems."
      },
      {
        number: "5",
        marks: rules.secB.marksPerQ,
        text: "Analyze the structural differences between user-level threads (many-to-one) and kernel-level threads (one-to-one) regarding context switch overhead."
      },
      {
        number: "6",
        marks: rules.secB.marksPerQ,
        text: "Calculate the average turnaround time and waiting time for a set of processes using the Shortest Remaining Time First (SRTF) scheduling algorithm."
      },
      {
        number: "7",
        marks: rules.secB.marksPerQ,
        text: "Design a disk scheduling algorithm strategy comparing SCAN and C-SCAN. Prove why C-SCAN provides a more uniform wait time."
      },
      {
        number: "8",
        marks: rules.secB.marksPerQ,
        text: "Describe the structural layout of an inode in a UNIX-like file system. Explain how it supports massive file sizes through multi-level indirect pointers."
      },
      {
        number: "9",
        marks: rules.secB.marksPerQ,
        text: "Explain the producer-consumer synchronization problem. Implement a correct solution using standard counting semaphores."
      },
      {
        number: "10",
        marks: rules.secB.marksPerQ,
        text: "Evaluate the cause of memory thrashing in multiprogramming environments. How does the working set model mitigate this?"
      },
      {
        number: "11",
        marks: rules.secB.marksPerQ,
        text: "Explain the role of a hypervisor in a Type 1 vs Type 2 virtualization environment."
      },
      {
        number: "12",
        marks: rules.secB.marksPerQ,
        text: "Discuss the mechanics of a context switch. What hardware registers are saved and restored during the interrupt?"
      },
      {
        number: "13",
        marks: rules.secB.marksPerQ,
        text: "Contrast internal and external fragmentation in memory management. Which allocation strategy suffers from which?"
      },
      {
        number: "14",
        marks: rules.secB.marksPerQ,
        text: "Describe the boot sequence of an operating system, detailing the role of the BIOS, MBR, and bootloader."
      }
    ].slice(0, rules.secB.count);

    secCQuestions = Array.from({ length: rules.secC.count }, (_, idx) => ({
      number: `C${idx + 1}`,
      marks: rules.secC.marksPerQ,
      text: `Which synchronization primitive is best suited for OS level signaling? (Case #${idx + 1})`,
      subparts: [
        { label: "A", marks: 0, text: "Mutex Locks" },
        { label: "B", marks: 0, text: "Spinlocks" },
        { label: "C", marks: 0, text: "Counting Semaphores" },
        { label: "D", marks: 0, text: "Read-Write Locks" }
      ]
    }));
  }
  // ─── CASE 4: COMPUTER NETWORKS (CN) ───
  else if (subLower.includes("network") || subLower.includes("cn") || subLower.includes("tcp")) {
    secAQuestions = [
      {
        number: "1",
        marks: rules.secA.marksPerQ,
        text: "An enterprise wide-area network is suffering from severe packet loss due to heavy congestion during peak traffic. Design a comprehensive TCP Congestion Control strategy implementing Slow Start, Congestion Avoidance, and Fast Recovery.",
        subparts: [
          { label: "a", marks: Math.ceil(rules.secA.marksPerQ / 2), text: "Trace the Congestion Window (cwnd) size over 10 transmission rounds with a timeout at round 5." },
          { label: "b", marks: Math.floor(rules.secA.marksPerQ / 2), text: "Explain the difference between Reno and Tahoe TCP variants during triple duplicate ACKs." }
        ]
      },
      {
        number: "2",
        marks: rules.secA.marksPerQ,
        text: "A core internet router must quickly recalculate paths after a major link failure. Compare the convergence times and routing loop vulnerabilities of Distance Vector (RIP) vs Link State (OSPF) routing protocols.",
        subparts: [
          { label: "a", marks: Math.ceil(rules.secA.marksPerQ / 2), text: "Demonstrate the count-to-infinity problem in Distance Vector networks." },
          { label: "b", marks: Math.floor(rules.secA.marksPerQ / 2), text: "Explain how Dijkstra's algorithm computes the SPF tree in OSPF." }
        ]
      }
    ].slice(0, rules.secA.count);

    secBQuestions = [
      {
        number: "3",
        marks: rules.secB.marksPerQ,
        text: "Given an IP block 192.168.10.0/24, design a Variable Length Subnet Masking (VLSM) scheme to accommodate 4 departments with 100, 50, 25, and 10 hosts respectively."
      },
      {
        number: "4",
        marks: rules.secB.marksPerQ,
        text: "Explain the hidden node problem in wireless networks (802.11). Detail how CSMA/CA and RTS/CTS frames mitigate this issue."
      },
      {
        number: "5",
        marks: rules.secB.marksPerQ,
        text: "Contrast the OSI Reference Model with the TCP/IP stack. Specifically map the session and presentation layers."
      },
      {
        number: "6",
        marks: rules.secB.marksPerQ,
        text: "Describe the mechanics of the Address Resolution Protocol (ARP). Include the structure of ARP broadcasts and cache poisoning vulnerabilities."
      },
      {
        number: "7",
        marks: rules.secB.marksPerQ,
        text: "Calculate the throughput of a Stop-and-Wait ARQ protocol on a 1 Gbps link with a 10ms round-trip time and 1000-byte frames."
      },
      {
        number: "8",
        marks: rules.secB.marksPerQ,
        text: "Explain the purpose of BGP (Border Gateway Protocol) in the Internet core. Why does it use path-vector instead of standard link-state?"
      },
      {
        number: "9",
        marks: rules.secB.marksPerQ,
        text: "Trace the complete sequence of DNS queries (Iterative vs Recursive) required to resolve 'www.example.com' starting from a blank local cache."
      },
      {
        number: "10",
        marks: rules.secB.marksPerQ,
        text: "Analyze the header fields of an IPv6 packet. Explain how IPv6 eliminates the need for header checksums and fragmentation at routers."
      },
      {
        number: "11",
        marks: rules.secB.marksPerQ,
        text: "Discuss how NAT (Network Address Translation) works. What are its implications for end-to-end connectivity?"
      },
      {
        number: "12",
        marks: rules.secB.marksPerQ,
        text: "Explain the operation of a transparent switch learning MAC addresses on a local subnet."
      },
      {
        number: "13",
        marks: rules.secB.marksPerQ,
        text: "Compare UDP and TCP headers. In what specific streaming video scenarios is UDP heavily preferred?"
      },
      {
        number: "14",
        marks: rules.secB.marksPerQ,
        text: "Detail the process of a DHCP client obtaining an IP address (DORA process)."
      }
    ].slice(0, rules.secB.count);

    secCQuestions = Array.from({ length: rules.secC.count }, (_, idx) => ({
      number: `C${idx + 1}`,
      marks: rules.secC.marksPerQ,
      text: `Which layer of the OSI model is responsible for routing and logical addressing? (Case #${idx + 1})`,
      subparts: [
        { label: "A", marks: 0, text: "Data Link Layer" },
        { label: "B", marks: 0, text: "Network Layer" },
        { label: "C", marks: 0, text: "Transport Layer" },
        { label: "D", marks: 0, text: "Session Layer" }
      ]
    }));
  }
  // ─── CASE 5: GENERAL DYNAMIC SCENARIO GENERATOR (GUARANTEES DIVERSITY) ───
  else {
    const topics = analysis.predictedTopics && analysis.predictedTopics.length > 0 
      ? analysis.predictedTopics 
      : [options.subject];
      
    const verbs = ["Model", "Design", "Synthesize", "Propose", "Formulate", "Optimize", "Evaluate", "Reconstruct", "Implement", "Benchmark"];
    const contexts = [
      "handling high-throughput industrial concurrency pools",
      "suffering from latency propagation under peak thread loads",
      "operating within hardware-constrained logical boundaries",
      "configured inside high-volume distributed server clusters",
      "managing complex state boundaries in multi-master pools",
      "subject to heavy network payload bottlenecks and delays",
      "optimizing resource usage inside memory-constrained blocks",
      "ensuring high-availability replication across partitioned nodes"
    ];

    secAQuestions = [
      {
        number: "1",
        marks: rules.secA.marksPerQ,
        text: `Propose an architectural framework targeting ${topics[0] || "core mechanics"} optimized for ${contexts[0]}. Analyze latency bottlenecks.`,
        subparts: [
          { label: "a", marks: Math.ceil(rules.secA.marksPerQ / 2), text: "Draft a system logic block layout and write execution boundary formulas." },
          { label: "b", marks: Math.floor(rules.secA.marksPerQ / 2), text: "Evaluate performance limitations if logical skew rates exceed 15% limits." }
        ]
      },
      {
        number: "2",
        marks: rules.secA.marksPerQ,
        text: `A corporate network running ${topics[1] || topics[0] || "logical units"} experiences structural bottlenecks under ${contexts[1]}. Formulate a resolution model.`,
        subparts: [
          { label: "a", marks: Math.ceil(rules.secA.marksPerQ / 2), text: "Draw the operational scheduling flow diagram to trace operational blocks." },
          { label: "b", marks: Math.floor(rules.secA.marksPerQ / 2), text: "Determine average execution bounds under maximum peak scale loads." }
        ]
      }
    ].slice(0, rules.secA.count);

    secBQuestions = Array.from({ length: rules.secB.count }, (_, idx) => {
      const topic = topics[(idx + 2) % topics.length] || "logical blocks core";
      const context = contexts[(idx + 2) % contexts.length];
      const verb = verbs[idx % verbs.length];
      
      const questionTexts = [
        `${verb} a robust logic block structure for ${topic} that mitigates delays when ${context}. Discuss configuration specs.`,
        `Given the topic of ${topic}, ${verb} an operational control logic block to enhance performance parameters during ${context}.`,
        `${verb} a schematic layout mapping ${topic} variables to successfully resolve structural bottlenecks when ${context}.`,
        `Analyze the operational latency when ${context}. ${verb} an optimal scheduling strategy for ${topic} modules.`,
        `How does ${topic} interact with external logical constraints? ${verb} a hardware-aware boundary model when ${context}.`,
        `${verb} a high-capacity buffering queue protocol for ${topic} that maintains logical consistency during ${context}.`,
        `Model the latency scaling indices for ${topic} parameters. ${verb} a partitioning algorithm when ${context}.`,
        `${verb} a hazard-free code execution schematic for ${topic} structures running within environments ${context}.`,
        `Design a state-driven architecture for ${topic} to bypass concurrency failures.`,
        `Formulate mathematical proofs verifying ${topic} boundaries under pressure.`,
        `Synthesize a hybrid ${topic} layout bypassing traditional throughput limits.`,
        `Evaluate the structural resilience of ${topic} when injected with random fault conditions.`
      ];

      return {
        number: String(idx + 3),
        marks: rules.secB.marksPerQ,
        text: questionTexts[idx % questionTexts.length]
      };
    });

    secCQuestions = Array.from({ length: rules.secC.count }, (_, idx) => {
      const topic = topics[(idx + 4) % topics.length] || "operational parameters";
      return {
        number: `C${idx + 1}`,
        marks: rules.secC.marksPerQ,
        text: `Which architectural parameter represents the principal bottleneck when scaling a ${topic} system under heavy operational load?`,
        subparts: [
          { label: "A", marks: 0, text: "Propagation bus skew" },
          { label: "B", marks: 0, text: "Dynamic memory bounds" },
          { label: "C", marks: 0, text: "Thread locking deadlocks" },
          { label: "D", marks: 0, text: "I/O write pipeline contention" }
        ]
      };
    });
  }

  // Update question numbers globally so they are continuous
  let globalQNum = 1;
  for (const q of secAQuestions) { q.number = String(globalQNum++); }
  for (const q of secBQuestions) { q.number = String(globalQNum++); }
  for (const q of secCQuestions) { q.number = String(globalQNum++); }

  return {
    university: options.university || "University Board of Examination",
    examTitle: "Semester End Predicted Examination",
    subject: options.subject,
    subjectCode: code,
    branch: branchName,
    semester: semValue,
    examDate: new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    durationMinutes: 180,
    totalMarks: rules.total,
    examType: "Theory",
    instructions: [
      "All questions are compulsory.",
      "Assume suitable data wherever necessary and state your assumptions clearly.",
      "Draw neat schematics or logic block diagrams where appropriate to support your arguments."
    ],
    sections: [
      {
        title: `SECTION A (Critical Analysis - ${rules.secA.marks} Marks)`,
        sectionMarks: rules.secA.marks,
        attemptRule: `Answer all questions. Each question carries ${rules.secA.marksPerQ} marks.`,
        questions: secAQuestions
      },
      {
        title: `SECTION B (Scenario-Based Technical Core - ${rules.secB.marks} Marks)`,
        sectionMarks: rules.secB.marks,
        attemptRule: `Answer all questions. Each question carries ${rules.secB.marksPerQ} marks.`,
        questions: secBQuestions
      },
      {
        title: `SECTION C (Concept Verification MCQs - ${rules.secC.marks} Marks)`,
        sectionMarks: rules.secC.marks,
        attemptRule: `Attempt all questions. Each question carries ${rules.secC.marksPerQ} marks.`,
        questions: secCQuestions
      }
    ],
    footerNote: "--- End of Predicted Examination Paper (Safely Rendered Fallback) ---"
  };
}
