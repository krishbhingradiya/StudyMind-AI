"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, FileText, Brain, Map, BarChart3, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/services/api";
import { formatMetricPercent } from "@/lib/quiz-scoring";
import type { DashboardAnalytics } from "@/types";

const quickActions = [
  { href: "/uploads", label: "Upload Material", icon: Upload },
  { href: "/notes", label: "Generate Notes", icon: FileText },
  { href: "/quiz", label: "Take Quiz", icon: Brain },
  { href: "/roadmap", label: "View Roadmap", icon: Map },
];

const MASTERY_LABELS: Record<string, string> = {
  none: "Not started",
  beginner: "Beginner",
  developing: "Developing",
  proficient: "Proficient",
  advanced: "Advanced",
};

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics().then((res) => {
      if (res.success && res.data) setAnalytics(res.data as DashboardAnalytics);
      setLoading(false);
    });
  }, []);

  const stats = analytics?.stats;
  const avgQuizLabel = formatMetricPercent(
    stats?.avgQuizScore,
    stats?.hasQuizData
  );
  const avgQuizIsEmpty = avgQuizLabel === "No quiz data yet";

  const statCards = [
    { label: "Exam Readiness", value: `${stats?.examReadiness ?? 0}%`, icon: TrendingUp },
    {
      label: "Avg Quiz Score",
      value: avgQuizLabel,
      icon: Brain,
      muted: avgQuizIsEmpty,
    },
    { label: "Uploads", value: String(stats?.totalUploads ?? 0), icon: Upload },
    { label: "Weak Topics", value: String(stats?.weakTopicCount ?? 0), icon: BarChart3 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your academic intelligence overview</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? statCards.map((s) => <Skeleton key={s.label} className="h-28" />)
          : statCards.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="glass">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {s.label}
                    </CardTitle>
                    <s.icon className="h-4 w-4 text-primary" />
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

      {!loading && analytics && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Mastery Level</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold capitalize">
                {MASTERY_LABELS[analytics.masteryLevel] ?? analytics.masteryLevel}
              </p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Weekly Improvement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">
                {stats?.weeklyImprovement != null
                  ? `${stats.weeklyImprovement > 0 ? "+" : ""}${stats.weeklyImprovement}%`
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
              <p className="text-xl font-semibold">{stats?.studyConsistency ?? 0}%</p>
              <p className="text-xs text-muted-foreground">active days (14d window)</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div>
        <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href}>
              <Card className="glass cursor-pointer transition-transform hover:scale-[1.02]">
                <CardContent className="flex items-center gap-3 p-6">
                  <a.icon className="h-5 w-5 text-primary" />
                  <span className="font-medium">{a.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
