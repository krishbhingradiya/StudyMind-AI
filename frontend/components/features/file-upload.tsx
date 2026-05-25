"use client";

import { useCallback, useState } from "react";
import { Upload, File, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type MaterialTypeOption =
  | "syllabus"
  | "ppt"
  | "notes"
  | "textbook"
  | "past_paper"
  | "general";

export interface UploadMeta {
  subject?: string;
  materialType: MaterialTypeOption;
  university?: string;
  branch?: string;
  semester?: string;
}

interface FileUploadProps {
  onUpload: (file: File, meta: UploadMeta) => Promise<void>;
  accept?: string;
  defaultUniversity?: string;
  defaultBranch?: string;
  defaultSemester?: number;
  disabled?: boolean;
}

const materialTypes: { value: MaterialTypeOption; label: string }[] = [
  { value: "syllabus", label: "Syllabus PDF" },
  { value: "ppt", label: "PPT / Slides" },
  { value: "notes", label: "Notes" },
  { value: "textbook", label: "Textbook chapter" },
  { value: "past_paper", label: "Past paper" },
  { value: "general", label: "Other material" },
];

export function FileUpload({
  onUpload,
  accept = ".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp,.txt,.ppt,.pptx",
  defaultUniversity = "",
  defaultBranch = "",
  defaultSemester,
  disabled = false,
}: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [materialType, setMaterialType] = useState<MaterialTypeOption>("notes");
  const [university, setUniversity] = useState(defaultUniversity);
  const [branch, setBranch] = useState(defaultBranch);
  const [semester, setSemester] = useState(defaultSemester ? String(defaultSemester) : "");
  const [loading, setLoading] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      await onUpload(file, {
        subject: subject || undefined,
        materialType,
        university: university || undefined,
        branch: branch || undefined,
        semester: semester || undefined,
      });
      setFile(null);
      setSubject("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "glass flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          disabled && "opacity-40 cursor-not-allowed pointer-events-none"
        )}
        onClick={() => !disabled && document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          className="hidden"
          accept={accept}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <Upload className="mb-3 h-10 w-10 text-primary" />
        <p className="font-medium">Drop syllabus, PPT, notes, or papers</p>
        <p className="mt-1 text-sm text-muted-foreground">AI will extract topics and build your academic graph</p>
      </div>
      {file && (
        <div className="glass flex items-center justify-between rounded-xl p-4">
          <div className="flex items-center gap-3">
            <File className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{file.name}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {file && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Material type</label>
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm"
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value as MaterialTypeOption)}
            >
              {materialTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Subject</label>
            <Input placeholder="e.g. Data Structures" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">University</label>
            <Input placeholder="GTU, Mumbai University…" value={university} onChange={(e) => setUniversity(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">Branch</label>
            <Input placeholder="Computer Engineering" value={branch} onChange={(e) => setBranch(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">Semester</label>
            <Input type="number" value={semester} onChange={(e) => setSemester(e.target.value)} />
          </div>
        </div>
      )}
      {file && (
        <Button onClick={handleUpload} disabled={loading} className="w-full" variant="gradient">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading file…
            </>
          ) : (
            "Upload & Analyze with AI"
          )}
        </Button>
      )}
    </div>
  );
}
