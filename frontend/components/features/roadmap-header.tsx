"use client";

import { Sparkles, BookOpen, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoadmapHeaderProps {
  title: string;
  subject?: string;
  topic?: string;
  examDate?: string;
  hasRoadmap: boolean;
  onNewClick: () => void;
}

export function RoadmapHeader({
  title,
  subject,
  topic,
  examDate,
  hasRoadmap,
  onNewClick,
}: RoadmapHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3.5xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/95 to-primary bg-clip-text text-transparent">
          {hasRoadmap ? title : "AI Verified Study Roadmap"}
        </h1>
        {hasRoadmap ? (
          <p className="text-sm text-muted-foreground mt-1 font-semibold flex items-center gap-1.5 flex-wrap">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <span>{subject}</span>
            {topic && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span>Focus: {topic}</span>
              </>
            )}
            {examDate && (
              <>
                <span className="text-muted-foreground/50">·</span>
                <span className="text-primary font-mono bg-primary/5 px-2 py-0.5 rounded text-xs">
                  Exam Date: {examDate}
                </span>
              </>
            )}
          </p>
        ) : (
          <p className="text-muted-foreground mt-1 text-sm">
            University-aligned · syllabus-aware · continuous active verification path.
          </p>
        )}
      </div>
      {hasRoadmap && (
        <Button
          variant="outline"
          onClick={onNewClick}
          className="border-border/60 hover:bg-accent/40 font-semibold flex items-center gap-1.5 shadow-sm shrink-0"
        >
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          New Syllabus Roadmap
        </Button>
      )}
    </div>
  );
}
