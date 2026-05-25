"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";
import type { VerificationChallenge, VerifiedRoadmapTask, QuizQuestion, Roadmap } from "@/types";

interface Props {
  task: VerifiedRoadmapTask;
  onClose: () => void;
  onComplete: (roadmap: Roadmap) => void;
}

export function RoadmapVerifyModal({ task, onClose, onComplete }: Props) {
  const [challenge, setChallenge] = useState<VerificationChallenge | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [writtenAnswer, setWrittenAnswer] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const startVerification = async () => {
    setLoading(true);
    const res = await api.prepareTaskVerification(task.id);
    setLoading(false);
    if (res.success && res.data) {
      const c = res.data as VerificationChallenge;
      setChallenge(c);
      if (c.method === "timer") setTimerActive(true);
    } else {
      toast.error(res.error || "Could not start verification");
    }
  };

  const submit = async () => {
    setSubmitting(true);
    const payload: Record<string, unknown> = {};
    if (challenge?.method === "mini_quiz") payload.answers = answers;
    else if (challenge?.method === "timer") payload.sessionId = challenge.sessionId;
    else payload.writtenAnswer = writtenAnswer;

    const res = await api.submitTaskVerification(task.id, payload);
    setSubmitting(false);

    if (res.success && res.data) {
      const d = res.data as { passed: boolean; feedback: string; roadmap: Roadmap };
      if (d.passed) {
        toast.success(d.feedback || "Task verified!");
        onComplete(d.roadmap);
        onClose();
      } else {
        toast.error(d.feedback || "Not passed yet — try again");
      }
    } else {
      toast.error(res.error || "Verification failed");
    }
  };

  useEffect(() => {
    if (!timerActive) return;
    const t = setInterval(() => setTimerSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [timerActive]);

  const formatTime = `${Math.floor(timerSeconds / 60)}:${String(timerSeconds % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="glass max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-lg">Verify: {task.task_title}</CardTitle>
            <p className="text-xs text-muted-foreground capitalize">
              {task.verification_method.replace("_", " ")} · Pass: 70%+
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!challenge ? (
            <Button variant="gradient" className="w-full" onClick={startVerification} disabled={loading}>
              {loading ? "Preparing challenge…" : "Start Verification"}
            </Button>
          ) : challenge.method === "mini_quiz" && challenge.questions ? (
            <div className="space-y-4">
              {challenge.questions.map((question: QuizQuestion, qi) => (
                <div key={question.id} className="space-y-3 rounded-lg border border-border/50 p-4 bg-card">
                  <p className="text-sm font-semibold">
                    Q{qi + 1}. {question.question}
                  </p>
                  <div className="grid gap-2">
                    {question.options?.map((opt, optIdx) => {
                      const isSelected = answers[question.id] === optIdx.toString();
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => setAnswers({ ...answers, [question.id]: optIdx.toString() })}
                          className={`w-full rounded-lg border p-2.5 text-left text-sm transition-all duration-200 ${
                            isSelected
                              ? "border-primary bg-primary/10 font-medium text-primary shadow-sm"
                              : "border-border hover:border-primary/50 hover:bg-accent/50"
                          }`}
                        >
                          <span className="inline-block w-5 font-bold text-primary mr-2">
                            {String.fromCharCode(65 + optIdx)}.
                          </span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : challenge.method === "timer" ? (
            <div className="text-center space-y-3 py-4">
              <Clock className="mx-auto h-10 w-10 text-primary" />
              <p className="text-3xl font-mono font-bold">{formatTime}</p>
              <p className="text-sm text-muted-foreground">
                Study for at least {challenge.minMinutes || 15} minutes, then submit.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">{challenge.prompt}</p>
              <textarea
                className="min-h-[140px] w-full rounded-lg border border-border bg-background p-3 text-sm"
                value={writtenAnswer}
                onChange={(e) => setWrittenAnswer(e.target.value)}
                placeholder="Write your answer here (min 30 characters)…"
              />
            </div>
          )}

          {challenge && (
            <Button
              variant="gradient"
              className="w-full"
              onClick={submit}
              disabled={
                submitting ||
                (challenge.method === "mini_quiz" &&
                  challenge.questions?.some((qq) => !answers[qq.id]))
              }
            >
              {submitting ? "Checking with AI…" : "Submit for Verification"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
