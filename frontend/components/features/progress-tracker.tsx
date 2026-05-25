"use client";

import { motion } from "framer-motion";

function ProgressRing({ value, label }: { value: number; label: string }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="flex flex-col items-center gap-1.5 bg-background/40 p-3.5 rounded-xl border border-border/40 backdrop-blur-sm shadow-sm shrink-0">
      <div className="relative flex h-[80px] w-[80px] items-center justify-center">
        <svg width="80" height="80" className="absolute -rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="text-primary transition-all duration-700"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-base font-extrabold text-foreground">{value}%</span>
      </div>
      <span className="text-3xs font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
    </div>
  );
}

interface ProgressTrackerProps {
  progressPercentage: number;
  examReadiness: number;
}

export function ProgressTracker({
  progressPercentage,
  examReadiness,
}: ProgressTrackerProps) {
  return (
    <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] items-center bg-card rounded-2xl border border-border/50 shadow-xl relative overflow-hidden glass">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-emerald-500" />
      <div>
        <h3 className="text-lg font-extrabold text-foreground">Syllabus Completion Track</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Complete daily tasks to unlock mock exams and active verification stages.
        </p>
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold font-mono">
            <span className="text-muted-foreground uppercase tracking-wider">Overall Progress</span>
            <span className="text-primary">{progressPercentage}% Complete</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted border border-border/20 shadow-inner">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
      <div className="flex gap-4 justify-center sm:justify-end border-t border-border/30 pt-4 sm:pt-0 sm:border-0 shrink-0">
        <ProgressRing value={progressPercentage} label="Progress" />
        <ProgressRing value={examReadiness} label="Readiness" />
      </div>
    </div>
  );
}
