"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Target,
  AlertTriangle,
  FileSearch,
  Map,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";

interface AcademicDashboard {
  university?: string;
  branch?: string;
  semester?: number;
  syllabusCompletion: number;
  examReadiness: number;
  roadmapProgress: number;
  masteryScore: number;
  importantTopicsRemaining: string[];
  weakSubjects: string[];
  materialsAnalyzed: number;
  examPatternsFound: number;
  predictedTopics: string[];
  unitMastery: Record<string, number>;
  subjects: { subject_name: string; unit_structure: unknown[] }[];
}

export default function AcademicDashboardPage() {
  const [data, setData] = useState<AcademicDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAcademicDashboard().then((r) => {
      if (r.success && r.data) setData(r.data as AcademicDashboard);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const masteryEntries = Object.entries(data?.unitMastery || {}).slice(0, 12);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            Academic Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">
            {data?.university || "Set university in Settings"}
            {data?.branch && ` · ${data.branch}`}
            {data?.semester && ` · Semester ${data.semester}`}
          </p>
        </div>
        <Link href="/roadmap">
          <Button variant="gradient">
            <Map className="mr-2 h-4 w-4" />
            Verified Roadmap
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Syllabus Coverage", value: `${data?.syllabusCompletion ?? 0}%`, icon: BookOpen },
          { label: "Exam Readiness", value: `${data?.examReadiness ?? 0}%`, icon: Target },
          { label: "Roadmap Progress", value: `${data?.roadmapProgress ?? 0}%`, icon: Map },
          { label: "Mastery Score", value: `${data?.masteryScore ?? 0}%`, icon: GraduationCap },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass">
              <CardContent className="flex items-center gap-3 p-5">
                <s.icon className="h-8 w-8 text-primary opacity-80" />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Priority Topics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.importantTopicsRemaining || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Upload syllabus or past papers to detect high-weightage topics.
              </p>
            ) : (
              data?.importantTopicsRemaining.map((t) => (
                <div key={t} className="rounded-lg border border-border/50 px-3 py-2 text-sm">
                  {t}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSearch className="h-4 w-4 text-primary" />
              Predicted Exam Topics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.predictedTopics || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {data?.examPatternsFound
                  ? "Analyzing patterns…"
                  : "Upload past year papers under Papers to unlock predictions."}
              </p>
            ) : (
              data?.predictedTopics.map((t) => (
                <div key={t} className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-sm">
                  {t}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">Topic Mastery (Knowledge Graph)</CardTitle>
          <p className="text-sm font-normal text-muted-foreground">
            {data?.materialsAnalyzed ?? 0} materials analyzed · {data?.subjects?.length ?? 0} subjects mapped
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {masteryEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Complete quizzes and upload materials to build your topic graph.
            </p>
          ) : (
            masteryEntries.map(([topic, score]) => (
              <div key={topic}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{topic}</span>
                  <span className="text-muted-foreground">{score}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {(data?.weakSubjects || []).length > 0 && (
        <Card className="glass border-destructive/20">
          <CardHeader>
            <CardTitle className="text-base">Weak Subjects / Topics</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {data?.weakSubjects.map((w) => (
              <span key={w} className="rounded-full bg-destructive/10 px-3 py-1 text-sm text-destructive">
                {w}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/uploads">
          <Button variant="outline">Upload Syllabus / Notes</Button>
        </Link>
        <Link href="/papers">
          <Button variant="outline">Upload Past Papers</Button>
        </Link>
      </div>
    </div>
  );
}
