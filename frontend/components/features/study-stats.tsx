"use client";

import { CheckSquare, Hourglass, Brain, Flame, AlertCircle, Bell } from "lucide-react";
import type { RoadmapEnhancement } from "@/types";

interface StudyStatsProps {
  completedCount: number;
  totalCount: number;
  estimatedHours: number;
  masteryScore: number;
  examReadiness: number;
  weakTopics: string[];
  enhancements?: RoadmapEnhancement;
}

export function StudyStats({
  completedCount,
  totalCount,
  estimatedHours,
  masteryScore,
  examReadiness,
  weakTopics,
  enhancements,
}: StudyStatsProps) {
  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4.5">
        <div className="flex items-center gap-2.5 bg-background/30 px-3.5 py-2.5 rounded-xl border border-border/40 backdrop-blur-sm shadow-sm">
          <CheckSquare className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-2xs text-muted-foreground font-bold uppercase tracking-wider">Verified Tasks</p>
            <p className="text-sm font-extrabold text-foreground">{completedCount} / {totalCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-background/30 px-3.5 py-2.5 rounded-xl border border-border/40 backdrop-blur-sm shadow-sm">
          <Hourglass className="h-5 w-5 text-indigo-500 shrink-0" />
          <div>
            <p className="text-2xs text-muted-foreground font-bold uppercase tracking-wider">Study Commitment</p>
            <p className="text-sm font-extrabold text-foreground">{estimatedHours}h Total</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-background/30 px-3.5 py-2.5 rounded-xl border border-border/40 backdrop-blur-sm shadow-sm">
          <Brain className="h-5 w-5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-2xs text-muted-foreground font-bold uppercase tracking-wider">Topic Mastery</p>
            <p className="text-sm font-extrabold text-foreground">{masteryScore}%</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 bg-background/30 px-3.5 py-2.5 rounded-xl border border-border/40 backdrop-blur-sm shadow-sm">
          <Flame className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <p className="text-2xs text-muted-foreground font-bold uppercase tracking-wider">Exam Readiness</p>
            <p className="text-sm font-extrabold text-foreground">{examReadiness}%</p>
          </div>
        </div>
      </div>

      {/* Weak Topics Section */}
      {weakTopics.length > 0 && (
        <div className="space-y-2 bg-rose-500/5 p-4 rounded-xl border border-rose-500/15">
          <p className="text-xs font-extrabold uppercase text-rose-500 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Detected Weak Topics Focus Areas:
          </p>
          <div className="flex flex-wrap gap-2">
            {weakTopics.map((topic) => (
              <span
                key={topic}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-sm"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Enhancements / Motivation */}
      {enhancements && (
        <div className="grid gap-4 sm:grid-cols-2">
          {enhancements.strategy && (
            <div className="bg-background/20 p-4 rounded-xl border border-border/40 backdrop-blur-sm flex flex-col justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase text-primary tracking-wider mb-1">AI Coach Strategy</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{enhancements.strategy}</p>
              </div>
              {enhancements.motivation && (
                <p className="text-xs text-primary/80 italic font-semibold border-t border-border/20 pt-2.5 mt-3">
                  "{enhancements.motivation}"
                </p>
              )}
            </div>
          )}
          
          {enhancements.weakTopicTips && enhancements.weakTopicTips.length > 0 && (
            <div className="bg-background/20 p-4 rounded-xl border border-border/40 backdrop-blur-sm">
              <p className="text-xs font-extrabold uppercase text-amber-500 tracking-wider mb-2 flex items-center gap-1">
                <Bell className="h-4 w-4 shrink-0 text-amber-500 animate-bounce" />
                Active Recall Reminders
              </p>
              <ul className="list-disc list-inside pl-1 text-sm text-muted-foreground space-y-1.5">
                {enhancements.weakTopicTips.map((tip, idx) => (
                  <li key={idx} className="leading-relaxed">{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
