"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, BookOpen, Lock, CheckCircle2, PlayCircle, Calendar, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VerifiedRoadmapTask } from "@/types";

interface TaskCardProps {
  task: VerifiedRoadmapTask;
  onVerify: (t: VerifiedRoadmapTask) => void;
}

function TaskCard({ task, onVerify }: TaskCardProps) {
  const locked = task.completion_status === "locked";
  const done = task.completion_status === "completed";
  const available = task.completion_status === "available" || task.completion_status === "in_progress";

  const getTaskTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      study: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      practice: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      quiz: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      mock_test: "bg-rose-500/10 text-rose-500 border-rose-500/20",
      revision: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      writing: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    };
    return badges[type] || "bg-muted text-muted-foreground border-border/40";
  };

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border p-4.5 transition-all duration-200",
        done && "border-emerald-500/30 bg-emerald-500/5 shadow-inner",
        locked && "opacity-50 border-border/30 bg-background/20",
        available && !done && "border-border/60 hover:border-primary/40 bg-card hover:shadow-md"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="flex gap-3.5">
          <div
            className={cn(
              "mt-0.5 flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-full transition-all duration-300",
              done 
                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/10" 
                : locked 
                  ? "bg-muted text-muted-foreground/60 border border-border/40" 
                  : "bg-primary/10 text-primary border border-primary/20"
            )}
          >
            {done ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : locked ? (
              <Lock className="h-4.5 w-4.5" />
            ) : (
              <PlayCircle className="h-5.5 w-5.5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className={cn("font-semibold text-base", done && "text-muted-foreground line-through")}>
                {task.task_title}
              </p>
              <span className={cn("px-2 py-0.5 rounded-full text-2xs font-bold uppercase border", getTaskTypeBadge(task.task_type))}>
                {task.task_type.replace("_", " ")}
              </span>
            </div>
            
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              <span className="capitalize">{task.verification_method.replace("_", " ")} verification</span>
              {task.due_date && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-1 font-mono text-2xs bg-accent px-1.5 py-0.5 rounded">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    Due {task.due_date}
                  </span>
                </>
              )}
            </p>
            {task.description && (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {task.description}
              </p>
            )}
            {done && task.mastery_score != null && (
              <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Brain className="h-4 w-4" />
                Verified Mastery Score: {task.mastery_score}%
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center self-end sm:self-start shrink-0">
          {available && !done && (
            <Button size="sm" variant="gradient" onClick={() => onVerify(task)} className="px-4 shadow-sm font-semibold">
              Verify Now
            </Button>
          )}
          {locked && (
            <span className="text-xs font-semibold text-muted-foreground/60 bg-muted px-2.5 py-1 rounded-lg border border-border/20">
              Locked
            </span>
          )}
          {done && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              Completed
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface WeekCardProps {
  weekNum: number;
  weekTasks: VerifiedRoadmapTask[];
  expandedWeek: number;
  onExpandToggle: (week: number) => void;
  scheduleInfo?: { week: number; topics: string[]; goals: string[] };
  phaseTitle: string;
  phaseDesc: string;
  onVerify: (task: VerifiedRoadmapTask) => void;
  isShortTerm?: boolean;
}

export function WeekCard({
  weekNum,
  weekTasks,
  expandedWeek,
  onExpandToggle,
  scheduleInfo,
  phaseTitle,
  phaseDesc,
  onVerify,
  isShortTerm = false,
}: WeekCardProps) {
  const weekCompleted = weekTasks.filter((t) => t.completion_status === "completed").length;
  const weekProgress = weekTasks.length 
    ? Math.round((weekCompleted / weekTasks.length) * 100)
    : 0;

  const isExpanded = expandedWeek === weekNum;

  return (
    <Card 
      className={cn(
        "glass overflow-hidden border transition-all duration-300 shadow-sm",
        isExpanded 
          ? "border-primary/50 shadow-md ring-1 ring-primary/20 bg-background/5" 
          : "border-border/60 hover:border-primary/30 bg-background/5"
      )}
    >
      {/* Accordion Trigger Header */}
      <div 
        onClick={() => onExpandToggle(isExpanded ? 0 : weekNum)}
        className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-accent/35 select-none transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={cn(
              "px-2.5 py-0.5 rounded-full text-3xs font-extrabold uppercase tracking-wider border",
              weekNum === 1 && "bg-blue-500/10 text-blue-500 border-blue-500/20",
              weekNum === 2 && "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
              weekNum === 3 && "bg-purple-500/10 text-purple-500 border-purple-500/20",
              weekNum === 4 && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            )}>
              {isShortTerm ? `Phase ${weekNum}` : `Week ${weekNum}`}
            </span>
            <h4 className="font-extrabold text-lg text-foreground truncate">{phaseTitle}</h4>
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">{phaseDesc}</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Weekly Micro-progress bar */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="text-2xs font-bold text-muted-foreground font-mono">
              {weekCompleted}/{weekTasks.length} Checked
            </span>
            <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-500",
                  weekProgress === 100 ? "bg-emerald-500" : "bg-primary"
                )}
                style={{ width: `${weekProgress}%` }}
              />
            </div>
          </div>

          <ChevronDown 
            className={cn(
              "h-5 w-5 text-muted-foreground transition-transform duration-300 shrink-0",
              isExpanded && "rotate-180 text-primary"
            )} 
          />
        </div>
      </div>

      {/* Accordion Collapsible Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-0 border-t border-border/40 bg-accent/5 space-y-4">
              
              {/* Revision and topics block */}
              {scheduleInfo && (
                <div className="rounded-xl border border-border/50 bg-background/50 p-4 space-y-2 shadow-inner">
                  <p className="text-xs font-extrabold uppercase text-primary tracking-wider flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    {isShortTerm ? `Phase ${weekNum}` : `Week ${weekNum}`} Study Goals & Topics:
                  </p>
                  <div className="text-sm text-muted-foreground leading-relaxed grid gap-2">
                    <div>
                      <span className="font-bold text-foreground">Topics: </span>
                      {scheduleInfo.topics?.join(", ") || "Active review topics"}
                    </div>
                    <div>
                      <span className="font-bold text-foreground">Goal: </span>
                      {scheduleInfo.goals?.join(" ") || "Complete daily practice modules."}
                    </div>
                  </div>
                </div>
              )}

              {/* Tasks checklist */}
              <div className="space-y-3">
                {weekTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-3 text-center bg-background/30 rounded-xl border border-dashed border-border/60">
                    No tasks structured for this week yet.
                  </p>
                ) : (
                  weekTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onVerify={onVerify} />
                  ))
                )}
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </Card>
  );
}
