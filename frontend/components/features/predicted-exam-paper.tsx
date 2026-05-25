"use client";

import { Printer, Calendar, Clock, Award, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PredictedExamPaper } from "@/types";

interface PredictedExamPaperViewProps {
  paper: PredictedExamPaper;
}

export function PredictedExamPaperView({ paper }: PredictedExamPaperViewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action Header block */}
      <div className="flex justify-end gap-3 print:hidden">
        <Button 
          variant="gradient" 
          onClick={handlePrint}
          className="shadow-md shadow-primary/20 flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Print / Export Exam PDF
        </Button>
      </div>

      {/* Main Exam Sheet paper */}
      <article
        id="predicted-exam-paper"
        className="exam-paper-sheet mx-auto max-w-[210mm] border border-neutral-300 bg-white p-12 text-black shadow-2xl relative overflow-hidden print:border-none print:bg-white print:p-0 print:shadow-none min-h-[297mm]"
      >
        {/* Subtle Watermark for premium look - screen only */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none print:hidden">
          <Building2 className="w-[450px] h-[450px] text-neutral-900" />
        </div>

        {/* Outer Exam Border */}
        <div className="border border-double border-neutral-900 p-6 print:p-8 min-h-[280mm] flex flex-col justify-between">
          <div>
            {/* University Name Header */}
            <header className="border-b-2 border-neutral-900 pb-4 text-center">
              <h1 className="text-xl font-black uppercase tracking-widest text-neutral-900 font-serif">
                {paper.university}
              </h1>
              <p className="mt-1 text-sm font-bold uppercase tracking-wider text-neutral-800">
                {paper.examTitle}
              </p>
              
              <div className="mt-4 flex flex-wrap justify-center items-center gap-x-6 gap-y-1.5 text-xs font-bold text-neutral-700 bg-neutral-100/50 py-1.5 px-4 rounded border border-neutral-200">
                {paper.subjectCode && <span>Subject Code: <strong className="text-neutral-950">{paper.subjectCode}</strong></span>}
                {paper.branch && <span>Branch: <strong className="text-neutral-950">{paper.branch}</strong></span>}
                {paper.semester && <span>Semester: <strong className="text-neutral-950">{paper.semester}</strong></span>}
                {paper.examType && <span>Type: <strong className="text-neutral-950">{paper.examType}</strong></span>}
              </div>

              <h2 className="mt-3 text-lg font-black text-neutral-950 underline underline-offset-4 decoration-2">
                Subject: {paper.subject}
              </h2>
            </header>

            {/* Exam Parameters Table */}
            <div className="my-4 grid grid-cols-2 border border-neutral-900 text-xs font-bold uppercase">
              <div className="border-r border-neutral-900 px-4 py-2.5 flex items-center gap-1.5 text-neutral-800">
                <Calendar className="h-3.5 w-3.5" /> Date: {paper.examDate}
              </div>
              <div className="px-4 py-2.5 text-right flex items-center justify-end gap-1.5 text-neutral-800">
                <Clock className="h-3.5 w-3.5" /> Duration: {paper.durationMinutes} Minutes
              </div>
              <div className="col-span-2 border-t border-neutral-900 bg-neutral-50 px-4 py-3 text-center text-sm font-black text-neutral-950 tracking-wider flex items-center justify-center gap-1.5">
                <Award className="h-4 w-4 text-neutral-900" /> Maximum Marks: {paper.totalMarks}
              </div>
            </div>

            {/* General Instructions Section */}
            <section className="mb-6 border border-neutral-300 p-4 bg-neutral-50/20 rounded">
              <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-neutral-950 underline decoration-1 decoration-neutral-800">
                General Instructions for Students:
              </h2>
              <ol className="list-decimal space-y-1 pl-5 text-xs font-bold text-neutral-800 leading-relaxed">
                {paper.instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ol>
            </section>

            {/* Exam Sections */}
            {paper.sections.map((section, si) => (
              <section key={si} className="mb-8 break-inside-avoid">
                {/* Section Title Box */}
                <div className="mb-4 border-b border-neutral-800 pb-1.5 flex justify-between items-end">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-neutral-950 font-serif">
                      {section.title}
                    </h3>
                    <p className="text-[10px] font-bold text-neutral-700 mt-0.5">
                      Instructions: {section.attemptRule}
                    </p>
                  </div>
                  <div className="bg-neutral-900 text-white text-[10px] font-black px-2.5 py-0.5 rounded tracking-wide uppercase">
                    Total: {section.sectionMarks} Marks
                  </div>
                </div>

                {/* Section Questions */}
                <div className="space-y-6">
                  {section.questions.map((q) => (
                    <div key={q.number} className="break-inside-avoid">
                      <div className="flex gap-4 text-xs font-bold text-neutral-900 leading-relaxed">
                        <span className="min-w-[2.5rem] font-black font-serif text-sm">Q{q.number}.</span>
                        <div className="flex-1">
                          <div className="flex justify-between items-start gap-4">
                            <p className="flex-1 text-justify tracking-wide leading-relaxed">
                              {q.text}
                            </p>
                            <span className="shrink-0 font-serif font-black text-neutral-950 min-w-[2.5rem] text-right">
                              [{String(q.marks).padStart(2, "0")}]
                            </span>
                          </div>
                          
                          {q.note && (
                            <p className="mt-1.5 text-[10px] italic text-neutral-600 font-medium">
                              Note: {q.note}
                            </p>
                          )}

                          {/* Question Subparts */}
                          {q.subparts && q.subparts.length > 0 && (
                            <ul className="mt-3.5 space-y-3 pl-4 border-l border-neutral-200">
                              {q.subparts.map((part) => (
                                <li key={part.label} className="flex gap-2">
                                  <span className="font-serif font-black">({part.label})</span>
                                  <span className="flex-1 text-neutral-850 leading-relaxed font-semibold">{part.text}</span>
                                  <span className="shrink-0 font-serif font-black text-neutral-900 min-w-[2rem] text-right">
                                    [{String(part.marks).padStart(2, "0")}]
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Footer of Exam Paper */}
          <footer className="mt-12 border-t border-neutral-900 pt-4 text-center text-xs font-bold text-neutral-800 tracking-widest font-serif uppercase">
            {paper.footerNote}
          </footer>
        </div>
      </article>

      {/* Styled Printable Rules */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #predicted-exam-paper,
          #predicted-exam-paper * {
            visibility: visible;
          }
          #predicted-exam-paper {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: none;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
          }
          #predicted-exam-paper .border-double {
            border-style: double !important;
            border-width: 3px !important;
            border-color: black !important;
          }
          #predicted-exam-paper .border-neutral-900,
          #predicted-exam-paper .border-neutral-800 {
            border-color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
