"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Brain, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface LoadingSkeletonProps {
  statusMessage?: string;
  isGenerating?: boolean;
}

export function LoadingSkeleton({
  statusMessage = "Loading study roadmap...",
  isGenerating = false,
}: LoadingSkeletonProps) {
  return (
    <div className="space-y-6">
      {/* Visual Coach Loading Overlay if generating */}
      {isGenerating && (
        <Card className="glass border-primary/30 bg-primary/5 animate-pulse relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-indigo-500 animate-shimmer" />
          <CardContent className="flex items-center gap-4.5 p-6 justify-center text-center flex-col sm:flex-row sm:text-left">
            <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Brain className="h-6 w-6 text-primary animate-bounce" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-foreground flex items-center gap-2 justify-center sm:justify-start">
                <Sparkles className="h-5 w-5 text-primary shrink-0 animate-spin" />
                AI Coach is planning your modules
              </h3>
              <p className="text-sm text-muted-foreground mt-1 font-semibold leading-relaxed">
                {statusMessage}
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs font-semibold bg-accent px-3 py-1.5 rounded-full shrink-0 border border-border/40 ml-0 sm:ml-auto">
              <Loader2 className="h-4.5 w-4.5 text-primary animate-spin shrink-0" />
              Compiling...
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Card Skeleton */}
      <Card className="glass border-border/50 shadow-md">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-8 w-[60%] rounded-lg" />
            <Skeleton className="h-4 w-[40%] rounded-lg" />
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Week Timeline Accordion Skeletons */}
      <div className="space-y-4 pt-2">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="glass border-border/40 shadow-inner">
            <div className="p-5 flex items-center justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-6 w-36 rounded" />
                </div>
                <Skeleton className="h-4 w-60 rounded" />
              </div>
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
