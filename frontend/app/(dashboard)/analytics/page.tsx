"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api";
import { formatMetricPercent } from "@/lib/quiz-scoring";
import type { DashboardAnalytics } from "@/types";

const MASTERY_LABELS: Record<string, string> = {
  none: "Not started",
  beginner: "Beginner",
  developing: "Developing",
  proficient: "Proficient",
  advanced: "Advanced",
};

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAnalytics().then((r) => {
      if (r.success && r.data) setData(r.data as DashboardAnalytics);
      else setError(r.error || "Failed to load analytics");
      setLoading(false);
    });
  }, []);

  const activityData = Object.entries(data?.activityByDay || {}).map(([date, count]) => ({
    date: date.slice(5),
    count,
  }));

  const avgScoreLabel = formatMetricPercent(
    data?.stats.avgQuizScore,
    data?.stats.hasQuizData
  );
  const avgScoreIsEmpty = avgScoreLabel === "No quiz data yet";

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Analytics</h1>
        <Card className="glass p-8 text-center">
          <p className="text-destructive">{error}</p>
          <button
            type="button"
            className="mt-4 text-sm text-primary underline"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Track performance and exam readiness</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Exam Readiness", value: `${data?.stats.examReadiness ?? 0}%` },
          {
            label: "Avg Score",
            value: avgScoreLabel,
            muted: avgScoreIsEmpty,
          },
          { label: "Quizzes Completed", value: data?.stats.totalQuizzes ?? 0 },
          { label: "Roadmap", value: `${data?.stats.roadmapProgress ?? 0}%` },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="glass">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={
                    s.muted
                      ? "text-sm font-medium text-muted-foreground"
                      : "text-3xl font-bold"
                  }
                >
                  {s.value}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Mastery Level</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {MASTERY_LABELS[data?.masteryLevel ?? "none"] ?? data?.masteryLevel}
            </p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Weekly Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data?.stats.weeklyImprovement != null
                ? `${data.stats.weeklyImprovement > 0 ? "+" : ""}${data.stats.weeklyImprovement}%`
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">vs. prior 7 days</p>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Study Consistency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{data?.stats.studyConsistency ?? 0}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle>Quiz Performance</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Last {data?.quizPerformance?.length ?? 0} completed attempts (0–100%)
            </p>
          </CardHeader>
          <CardContent className="h-64">
            {(data?.quizPerformance?.length ?? 0) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.quizPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: any) => [`${v}%`, "Score"]} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No quiz data yet — complete a quiz to see performance trends
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle>Study Activity</CardTitle></CardHeader>
          <CardContent className="h-64">
            {activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Upload materials or generate notes to track activity
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Topic Performance</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            Average scores by topic (lowest first)
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.topicPerformance || []).map((t) => (
            <div
              key={t.topic}
              className="flex items-center justify-between rounded-lg border border-border/50 p-3"
            >
              <div>
                <span className="font-medium">{t.topic}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {t.attempts} attempt{t.attempts !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, t.avgScore)}%` }}
                  />
                </div>
                <span className="text-sm font-medium tabular-nums">{t.avgScore}%</span>
              </div>
            </div>
          ))}
          {!data?.topicPerformance?.length && (
            <p className="text-sm text-muted-foreground">
              No topic performance data yet. Complete quizzes across topics to see breakdowns.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader><CardTitle>Weak Topics</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.weakTopics || []).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-border/50 p-3"
              >
                <span>{t.topic_name}</span>
                <span className="text-sm text-destructive">
                  {Math.min(100, Math.max(0, Math.round(t.accuracy_percentage)))}% accuracy
                </span>
              </div>
            ))}
            {!data?.weakTopics?.length && (
              <p className="text-sm text-muted-foreground">
                No weak topics identified yet. Take quizzes to build insights.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader><CardTitle>Strong Topics</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.strongTopics || []).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-border/50 p-3"
              >
                <span>{t.topic_name}</span>
                <span className="text-sm text-primary">
                  {Math.min(100, Math.max(0, Math.round(t.accuracy_percentage)))}% accuracy
                </span>
              </div>
            ))}
            {!data?.strongTopics?.length && (
              <p className="text-sm text-muted-foreground">
                Strong topics appear after consistent quiz performance (70%+).
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
