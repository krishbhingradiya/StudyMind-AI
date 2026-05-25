"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2, File, Sparkles } from "lucide-react";
import { FileUpload, type UploadMeta } from "@/components/features/file-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { useProfile } from "@/hooks/useProfile";
import { formatDate } from "@/lib/utils";
import type { Upload } from "@/types";

export default function UploadsPage() {
  const { profile } = useProfile();
  const [uploads, setUploads] = useState<Upload[]>([]);

  const load = () => api.getUploads().then((r) => r.success && setUploads((r.data as Upload[]) || []));

  useEffect(() => {
    load();
  }, []);

  const pollUntilAnalyzed = (uploadId: string, attempts = 24) => {
    let remaining = attempts;
    const tick = async () => {
      const r = await api.getUploads();
      const list = (r.data as Upload[]) || [];
      const item = list.find((u) => u.id === uploadId);
      if (item?.analysis_id) {
        toast.success("AI analysis complete!");
        setUploads(list);
        return;
      }
      remaining -= 1;
      if (remaining > 0) setTimeout(tick, 3000);
    };
    setTimeout(tick, 3000);
  };

  const handleUpload = async (file: File, meta: UploadMeta) => {
    const fd = new FormData();
    fd.append("file", file);
    if (meta.subject) fd.append("subject", meta.subject);
    fd.append("materialType", meta.materialType);
    if (meta.university) fd.append("university", meta.university);
    if (meta.branch) fd.append("branch", meta.branch);
    if (meta.semester) fd.append("semester", meta.semester);

    const toastId = toast.loading("Uploading file…");
    const res = await api.uploadFile(fd);
    toast.dismiss(toastId);

    if (res.success) {
      const uploaded = res.data as Upload & { analysisPending?: boolean };
      toast.success(res.message || "File uploaded!");
      load();
      if (uploaded?.analysisPending && uploaded.id) {
        toast.info("AI is analyzing your material — usually 30–90 seconds.");
        pollUntilAnalyzed(uploaded.id);
      }
    } else toast.error(res.error || "Upload failed");
  };

  const handleDelete = async (id: string) => {
    const res = await api.deleteUpload(id);
    if (res.success) {
      toast.success("Deleted");
      load();
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Study Materials</h1>
        <p className="text-muted-foreground">
          Upload syllabus, PPTs, notes — AI extracts units, topics, and exam patterns for your roadmap
        </p>
      </div>
      <FileUpload
        onUpload={handleUpload}
        defaultUniversity={profile?.university}
        defaultBranch={profile?.branch}
        defaultSemester={profile?.semester}
      />
      <p className="text-center text-sm text-muted-foreground">
        View intelligence on your{" "}
        <Link href="/academic" className="text-primary underline">
          Academic Dashboard
        </Link>
      </p>
      <Card className="glass">
        <CardHeader>
          <CardTitle>Your Uploads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {uploads.length === 0 && <p className="text-sm text-muted-foreground">No uploads yet</p>}
          {uploads.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between rounded-lg border border-border/50 p-3"
            >
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{u.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(u.uploaded_at)}
                    {u.material_type && ` · ${u.material_type}`}
                    {u.subject && ` · ${u.subject}`}
                  </p>
                </div>
                {u.analysis_id && (
                  <span title="AI analyzed">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </span>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
