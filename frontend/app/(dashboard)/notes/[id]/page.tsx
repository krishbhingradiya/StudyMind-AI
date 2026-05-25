"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MarkdownRenderer } from "@/components/features/markdown-renderer";
import { api } from "@/services/api";
import type { Summary } from "@/types";

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [id, setId] = useState("");

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      api.getSummary(p.id).then((r) => r.success && setSummary(r.data as Summary));
    });
  }, [params]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/notes"><Button variant="ghost">← Back</Button></Link>
        <Link href={`/notes/handwriting?summaryId=${id}&targetPages=3`}>
          <Button variant="outline">Handwriting Mode</Button>
        </Link>
      </div>
      <h1 className="text-3xl font-bold">{summary?.title || "Loading..."}</h1>
      {summary && !summary.content?.trim() && (
        <Card className="glass border-dashed p-8 text-center text-muted-foreground">
          <p className="font-medium text-foreground">This note has no content.</p>
          <p className="mt-2 text-sm">
            It was saved before a fix for empty AI responses. Generate a new summary from{" "}
            <Link href="/notes" className="text-primary underline">
              AI Notes
            </Link>
            .
          </p>
        </Card>
      )}
      {summary?.content?.trim() && (
        <Card className="glass p-8">
          <MarkdownRenderer content={summary.content} />
        </Card>
      )}
    </div>
  );
}
