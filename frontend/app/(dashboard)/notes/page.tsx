"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";
import { formatDate } from "@/lib/utils";
import { useUploads } from "@/hooks/useUploads";
import { LAST_UPLOAD_KEY } from "@/lib/constants";
import type { Summary } from "@/types";

const summaryTypes = [
  { value: "concise", label: "Concise Summary" },
  { value: "key_points", label: "Key Points" },
  { value: "revision", label: "Revision Notes" },
  { value: "explanation", label: "Topic Explanation" },
  { value: "simplified", label: "Simplified Concepts" },
];

export default function NotesPage() {
  const router = useRouter();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const { uploads, selectedId: uploadId, setSelectedId: setUploadId } = useUploads();
  const [content, setContent] = useState("");
  const [summaryType, setSummaryType] = useState("concise");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [targetPages, setTargetPages] = useState(3);

  useEffect(() => {
    api.getSummaries().then((r) => r.success && setSummaries((r.data as Summary[]) || []));
  }, []);

  const generate = async () => {
    const hasUpload = Boolean(uploadId);
    const hasContent = Boolean(content.trim());

    if (!hasUpload && !hasContent) {
      toast.error("Select an uploaded file or paste study material below.");
      return;
    }

    setLoading(true);
    const res = await api.generateSummary({
      uploadId: uploadId || undefined,
      content: content.trim() || undefined,
      title: title || "AI Summary",
      summaryType,
      targetPages,
    });
    setLoading(false);

    if (res.success) {
      if (uploadId) localStorage.setItem(LAST_UPLOAD_KEY, uploadId);
      toast.success("Summary generated! Opening notebook…");
      api.getSummaries().then((r) => r.success && setSummaries((r.data as Summary[]) || []));
      const created = res.data as Summary | undefined;
      if (created?.id) {
        router.push(`/notes/handwriting?summaryId=${created.id}&targetPages=${targetPages}`);
      }
    } else {
      toast.error(res.error || "Failed to generate summary");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">AI Notes</h1>
        <p className="text-muted-foreground">Generate summaries with Markdown and LaTeX support</p>
      </div>
      <Card className="glass">
        <CardHeader><CardTitle>Generate Summary</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />

          <div className="space-y-1">
            <label className="text-sm font-medium">Study material (file)</label>
            {uploads.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No uploads yet.{" "}
                <Link href="/uploads" className="text-primary underline-offset-4 hover:underline">
                  Upload a file
                </Link>{" "}
                first, then return here.
              </p>
            ) : (
              <select
                className="w-full rounded-lg border border-border bg-background p-2"
                value={uploadId}
                onChange={(e) => setUploadId(e.target.value)}
              >
                <option value="">Select an uploaded file</option>
                {uploads.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.file_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Or paste text</label>
            <textarea
              className="min-h-[120px] w-full rounded-lg border border-border bg-background p-3 text-sm"
              placeholder="Paste notes or chapter text here (optional if you selected a file above)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <select
            className="w-full rounded-lg border border-border bg-background p-2"
            value={summaryType}
            onChange={(e) => setSummaryType(e.target.value)}
          >
            {summaryTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <div className="space-y-1">
            <label className="text-sm font-medium">Notebook pages</label>
            <p className="text-xs text-muted-foreground">
              AI will fit all important points within this many A4 handwriting pages.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={10}
                value={targetPages}
                onChange={(e) => setTargetPages(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="min-w-[4.5rem] rounded-lg border border-border bg-background px-2 py-1 text-center text-sm font-medium">
                {targetPages} {targetPages === 1 ? "page" : "pages"}
              </span>
            </div>
          </div>

          <Button
            variant="gradient"
            onClick={generate}
            disabled={loading || (uploads.length === 0 && !content.trim())}
          >
            {loading ? "Generating..." : "Generate Notes"}
          </Button>
        </CardContent>
      </Card>
      <Card className="glass">
        <CardHeader><CardTitle>Your Notes</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {summaries.map((s) => (
            <Link
              key={s.id}
              href={`/notes/${s.id}`}
              className="block rounded-lg border border-border/50 p-3 hover:bg-accent/50"
            >
              <p className="font-medium">{s.title}</p>
              <p className="text-xs text-muted-foreground">
                {s.summary_type} · {formatDate(s.created_at)}
              </p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
