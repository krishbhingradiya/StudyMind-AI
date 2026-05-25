"use client";

import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getQuizPercentage } from "@/lib/quiz-scoring";
import type { Quiz, QuizQuestion } from "@/types";

interface QuizReviewProps {
  quiz: Quiz;
  questions: QuizQuestion[];
  answers: Record<string, string>;
}

function formatDuration(seconds?: number) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function QuizReview({ quiz, questions, answers }: QuizReviewProps) {
  const maxScore = quiz.total_questions ?? quiz.max_score ?? questions.length;
  const score = quiz.correct_answers ?? quiz.score ?? 0;
  const percentage = getQuizPercentage(quiz) ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle>{quiz.topic}</CardTitle>
          <p className="text-sm text-muted-foreground">Your past attempt</p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-6">
          <div
            className={cn(
              "flex h-20 w-20 flex-col items-center justify-center rounded-full border-4",
              percentage >= 70 ? "border-primary text-primary" : percentage >= 50 ? "border-amber-500 text-amber-600" : "border-destructive text-destructive"
            )}
          >
            <span className="text-2xl font-bold">{percentage}%</span>
          </div>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-medium">{score}</span> of {maxScore} correct
            </p>
            <p className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Time: {formatDuration(quiz.time_taken_seconds ?? undefined)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {questions.map((q, i) => {
          const isMcq = q.type === "mcq" && Array.isArray(q.options) && q.options.length > 0;
          
          let isCorrect = false;
          let userAnsIndex = -1;
          let correctAnsIndex = q.correctAnswerIndex ?? -1;

          if (isMcq) {
            const rawAns = answers[q.id];
            userAnsIndex = rawAns !== undefined && rawAns !== null ? parseInt(String(rawAns), 10) : -1;
            
            // If correctAnswerIndex wasn't set, try parsing text
            if (correctAnsIndex === -1 && q.correctAnswer) {
              const target = q.correctAnswer.trim().toLowerCase();
              correctAnsIndex = q.options!.findIndex(opt => opt.trim().toLowerCase() === target);
            }
            isCorrect = userAnsIndex === correctAnsIndex;
          } else {
            // Fallback for text answers
            const userAnswerText = String(answers[q.id] || "").trim().toLowerCase();
            const correctAnswerText = String(q.correctAnswer || "").trim().toLowerCase();
            isCorrect = userAnswerText !== "" && userAnswerText === correctAnswerText;
          }

          return (
            <Card
              key={q.id}
              className={cn(
                "glass border-l-4 transition-all duration-300",
                isCorrect ? "border-l-emerald-500 bg-emerald-500/5" : "border-l-rose-500 bg-rose-500/5"
              )}
            >
              <CardContent className="space-y-4 pt-5">
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Question {i + 1} {q.topic ? ` · ${q.topic}` : ""}
                    </p>
                    <p className="mt-1 text-base font-semibold text-foreground">{q.question}</p>
                  </div>
                </div>

                {isMcq && q.options ? (
                  <div className="ml-8 grid gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      const wasSelected = optIdx === userAnsIndex;
                      const isCorrectOpt = optIdx === correctAnsIndex;
                      
                      return (
                        <div
                          key={optIdx}
                          className={cn(
                            "rounded-lg border p-3.5 text-sm flex items-start gap-2.5 transition-all duration-200",
                            isCorrectOpt
                              ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100 font-medium"
                              : wasSelected
                                ? "border-rose-500/60 bg-rose-500/10 text-rose-950 dark:text-rose-100"
                                : "border-border/50 bg-background/30 text-muted-foreground"
                          )}
                        >
                          <span className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            isCorrectOpt
                              ? "bg-emerald-500 text-white"
                              : wasSelected
                                ? "bg-rose-500 text-white"
                                : "bg-muted text-muted-foreground"
                          )}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {isCorrectOpt && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />}
                          {wasSelected && !isCorrectOpt && <XCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ml-8 space-y-3">
                    <div className="rounded-lg bg-muted/40 p-3.5 border border-border/40 text-sm">
                      <span className="font-semibold text-muted-foreground">Your answer: </span>
                      <p className={cn("mt-1", isCorrect ? "text-emerald-600 font-medium" : "text-rose-600")}>
                        {answers[q.id] || "—"}
                      </p>
                    </div>
                    {!isCorrect && q.correctAnswer && (
                      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5 text-sm">
                        <span className="font-semibold text-emerald-600">Expected answer: </span>
                        <p className="mt-1 text-emerald-950 dark:text-emerald-100">{q.correctAnswer}</p>
                      </div>
                    )}
                  </div>
                )}

                {q.explanation && (
                  <div className="ml-8 rounded-lg bg-accent/40 border border-border/40 p-3 text-xs italic text-muted-foreground flex gap-2">
                    <span className="font-bold text-primary not-italic">Explanation:</span>
                    <span>{q.explanation}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
