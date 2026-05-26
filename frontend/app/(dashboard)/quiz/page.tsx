"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { QuizPlayer } from "@/components/features/quiz-player";
import { QuizReview } from "@/components/features/quiz-review";
import { api } from "@/services/api";
import { useUploads } from "@/hooks/useUploads";
import { formatDate } from "@/lib/utils";
import { formatQuizScoreLabel } from "@/lib/quiz-scoring";
import type { Quiz, QuizQuestion } from "@/types";

type ViewMode = "list" | "take" | "review";

export default function QuizPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [playerKey, setPlayerKey] = useState(0);
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const { uploads, loading: loadingUploads, selectedId, setSelectedId } = useUploads();

  const load = () =>
    api.getQuizzes().then((r) => {
      if (r.success) setQuizzes((r.data as Quiz[]) || []);
      setLoadingHistory(false);
    });

  useEffect(() => {
    load();
  }, []);

  const backToList = () => {
    setViewMode("list");
    setActiveQuiz(null);
  };

  const generate = async () => {
    const hasUpload = Boolean(selectedId);
    const hasContent = Boolean(content.trim());

    if (!hasUpload && !hasContent) {
      toast.error("Select an uploaded file or paste study material below.");
      return;
    }

    setGenerating(true);
    const toastId = toast.loading("Generating quiz… usually 30–90 seconds.", { duration: 120000 });
    const res = await api.generateQuiz({
      uploadId: selectedId || undefined,
      content: content.trim() || undefined,
      topic: topic || "General",
      count,
    });
    toast.dismiss(toastId);
    setGenerating(false);

    if (res.success && res.data) {
      const q = res.data as Quiz;
      setActiveQuiz(q);
      setPlayerKey((k) => k + 1);
      setViewMode("take");
      toast.success("Quiz generated!");
    } else {
      toast.error(res.error || "Failed to generate quiz");
    }
  };

  const continueQuiz = async (quizId: string) => {
    setLoadingAction(quizId);
    const res = await api.getQuiz(quizId);
    setLoadingAction(null);
    if (res.success && res.data) {
      const q = res.data as Quiz;
      if (q.questions?.length) {
        setActiveQuiz(q);
        setPlayerKey((k) => k + 1);
        setViewMode("take");
      } else {
        toast.error("This quiz has no questions stored.");
      }
    } else {
      toast.error(res.error || "Could not load quiz");
    }
  };

  const viewPast = async (quizId: string) => {
    setLoadingAction(`past-${quizId}`);
    const res = await api.getQuiz(quizId);
    setLoadingAction(null);
    if (res.success && res.data) {
      const q = res.data as Quiz;
      if (q.score == null) {
        toast.error("Complete this quiz first to see your past results.");
        return;
      }
      if (!q.questions?.length) {
        toast.error("No questions found for this quiz.");
        return;
      }
      setActiveQuiz(q);
      setViewMode("review");
    } else {
      toast.error(res.error || "Could not load results");
    }
  };

  const reQuiz = async (quizId: string) => {
    setLoadingAction(`retake-${quizId}`);
    const res = await api.retakeQuiz(quizId);
    setLoadingAction(null);
    if (res.success && res.data) {
      const q = res.data as Quiz;
      if (q.questions?.length) {
        setActiveQuiz(q);
        setPlayerKey((k) => k + 1);
        setViewMode("take");
        toast.success("Re-Quiz started — same questions, fresh attempt!");
      } else {
        const full = await api.getQuiz(quizId);
        if (full.success && full.data) {
          const loaded = full.data as Quiz;
          setActiveQuiz({ ...loaded, score: null, answers: null });
          setPlayerKey((k) => k + 1);
          setViewMode("take");
          toast.success("Re-Quiz started!");
        }
      }
    } else {
      toast.error(res.error || "Could not start re-quiz");
    }
  };

  const submit = async (answers: Record<string, string>, timeTaken: number) => {
    const toastId = toast.loading("Submitting quiz…");
    const res = await api.submitQuiz({
      quizId: activeQuiz!.id,
      answers,
      timeTakenSeconds: timeTaken,
    });
    toast.dismiss(toastId);
    if (res.success) {
      const pct = (res.data as { percentage?: number }).percentage;
      toast.success(`Score: ${pct}% — view results in Quiz History`);
      backToList();
      load();
    } else {
      const msg = res.error || "Failed to submit quiz";
      if (msg.includes("max_score")) {
        toast.error(
          "Database needs an update. Run migration 004 in Supabase SQL Editor."
        );
      } else {
        toast.error(msg);
      }
    }
  };

  if (viewMode === "take" && activeQuiz && activeQuiz.questions && activeQuiz.questions.length) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={backToList}>
            ← Back
          </Button>
          <p className="text-sm text-muted-foreground">{activeQuiz.topic}</p>
        </div>
        <QuizPlayer
          key={playerKey}
          questions={activeQuiz.questions}
          onSubmit={submit}
        />
      </div>
    );
  }

  if (viewMode === "review" && activeQuiz && activeQuiz.questions && activeQuiz.questions.length) {
    const savedAnswers = activeQuiz.answers || {};
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={backToList}>
            ← Back to quizzes
          </Button>
          <Button variant="gradient" size="sm" onClick={() => reQuiz(activeQuiz.id)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Re-Quiz
          </Button>
        </div>
        <QuizReview
          quiz={activeQuiz}
          questions={activeQuiz.questions}
          answers={savedAnswers}
        />
      </div>
    );
  }

  const canGenerate = selectedId || content.trim();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Daily Quiz</h1>
        <p className="text-muted-foreground">
          Practice from your materials — re-quiz anytime or review past scores
        </p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Generate New Quiz</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Topic (e.g. Data Structures)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />

          <div className="space-y-1">
            <label className="text-sm font-medium">Study material (file)</label>
            {loadingUploads ? (
              <Skeleton className="h-10 w-full" />
            ) : uploads.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No uploads yet.{" "}
                <Link href="/uploads" className="text-primary underline-offset-4 hover:underline">
                  Upload a file
                </Link>{" "}
                first, then return here.
              </p>
            ) : (
              <select
                className="w-full rounded-lg border border-border bg-background p-2"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Select an uploaded file</option>
                {uploads.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.file_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Or paste text</label>
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-border bg-background p-3 text-sm"
              placeholder="Paste notes or chapter text (optional if you selected a file above)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Number of questions</label>
            <select
              className="w-full rounded-lg border border-border bg-background p-2"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            >
              {[5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n} questions
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="gradient"
            onClick={generate}
            disabled={generating || !canGenerate}
          >
            {generating ? "Generating..." : "Generate Quiz"}
          </Button>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Quiz History</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            View your past attempts or re-quiz with the same questions
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingHistory ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : quizzes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quizzes yet. Generate your first quiz above.</p>
          ) : (
            quizzes.map((q) => {
              const completed = q.score != null;
              const scoreLabel = completed ? formatQuizScoreLabel(q) : null;

              return (
                <div
                  key={q.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{q.topic}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(q.created_at)}
                      {completed && scoreLabel && (
                        <span className="ml-2 font-medium text-primary">
                          · {scoreLabel}
                        </span>
                      )}
                      {!completed && <span className="ml-2">· Not completed</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {completed ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewPast(q.id)}
                          disabled={loadingAction === `past-${q.id}`}
                        >
                          <History className="mr-1.5 h-3.5 w-3.5" />
                          {loadingAction === `past-${q.id}` ? "Loading…" : "View Past"}
                        </Button>
                        <Button
                          variant="gradient"
                          size="sm"
                          onClick={() => reQuiz(q.id)}
                          disabled={loadingAction === `retake-${q.id}`}
                        >
                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                          {loadingAction === `retake-${q.id}` ? "Starting…" : "Re-Quiz"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="gradient"
                        size="sm"
                        onClick={() => continueQuiz(q.id)}
                        disabled={loadingAction === q.id}
                      >
                        {loadingAction === q.id ? "Loading…" : "Continue Quiz"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
