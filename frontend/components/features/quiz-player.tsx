"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuizQuestion } from "@/types";

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onSubmit: (answers: Record<string, number | string>, timeTaken: number) => Promise<void>;
  readOnly?: boolean;
}

export function QuizPlayer({ questions, onSubmit, readOnly }: QuizPlayerProps) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [seconds, setSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const q = questions[current];
  const formatTime = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const handleSubmit = async () => {
    setSubmitting(true);
    await onSubmit(answers, seconds);
    setSubmitting(false);
  };

  if (!q) return null;

  return (
    <Card className="glass max-w-2xl mx-auto flex flex-col h-[550px] overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
        <CardTitle className="text-xl">Question {current + 1} of {questions.length}</CardTitle>
        <span className="font-mono text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">{formatTime}</span>
      </CardHeader>
      
      {/* Scrollable question area */}
      <CardContent className="flex-1 overflow-y-auto p-6 space-y-6">
        <p className="text-lg font-semibold leading-relaxed text-foreground">{q.question}</p>
        
        {q.type === "mcq" && q.options ? (
          <div className="grid gap-3">
            {q.options.map((opt, index) => {
              const optionLetter = String.fromCharCode(65 + index); // A, B, C, D...
              const isSelected = answers[q.id] === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setAnswers({ ...answers, [q.id]: index })}
                  className={`w-full rounded-lg border-2 p-4 text-left transition-all duration-200 flex items-start gap-3 ${
                    isSelected
                      ? "border-primary bg-primary/10 font-semibold text-primary shadow-sm"
                      : "border-border/60 hover:border-primary/50 hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                    isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {optionLetter}
                  </span>
                  <span className="text-sm font-medium">{opt}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <textarea
            className="w-full rounded-lg border border-border bg-background p-4 min-h-[160px] text-sm focus:outline-none focus:ring-2 focus:ring-primary/45 transition-all resize-none"
            value={answers[q.id] || ""}
            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
            placeholder="Type your answer here..."
          />
        )}
      </CardContent>

      {/* Sticky Action Footer */}
      <div className="border-t border-border/40 p-4 bg-background/50 backdrop-blur-sm flex justify-between gap-3 sticky bottom-0 z-10">
        <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
          Previous
        </Button>
        {current < questions.length - 1 ? (
          <Button onClick={() => setCurrent((c) => c + 1)} disabled={!readOnly && answers[q.id] === undefined}>
            Next
          </Button>
        ) : readOnly ? (
          <Button variant="outline" disabled>
            Completed
          </Button>
        ) : (
          <Button variant="gradient" onClick={handleSubmit} disabled={submitting || answers[q.id] === undefined}>
            {submitting ? "Submitting..." : "Submit Quiz"}
          </Button>
        )}
      </div>
    </Card>
  );
}
