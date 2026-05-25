"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HandwritingView } from "@/components/features/handwriting-view";
import { api } from "@/services/api";
import type { Summary } from "@/types";

function HandwritingContent() {
  const params = useSearchParams();
  const summaryId = params.get("summaryId");
  const targetPagesParam = params.get("targetPages");
  const targetPages = targetPagesParam ? Math.min(15, Math.max(1, Number(targetPagesParam))) : undefined;
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (summaryId) api.getSummary(summaryId).then((r) => r.success && setSummary(r.data as Summary));
  }, [summaryId]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-2">
      <div className="flex items-center justify-between print:hidden">
        <Link href={summaryId ? `/notes/${summaryId}` : "/notes"}>
          <Button variant="ghost" className="hover:bg-accent/80 font-medium">
            ← Back to Notes
          </Button>
        </Link>
        <Button onClick={() => window.print()} className="font-semibold shadow-sm shadow-primary/10">
          Print Full Notebook
        </Button>
      </div>
      {summary?.content ? (
        <HandwritingView
          content={summary.content}
          title={summary.title}
          targetPages={targetPages}
        />
      ) : (
        <div className="text-center py-12 card border border-dashed rounded-xl bg-card/45 backdrop-blur">
          <p className="text-muted-foreground">Select a note to view in handwriting mode</p>
        </div>
      )}
    </div>
  );

}

export default function HandwritingPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <HandwritingContent />
    </Suspense>
  );
}
