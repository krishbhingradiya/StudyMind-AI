"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Building, 
  Layers, 
  BookOpen, 
  FileText, 
  Calendar, 
  Clock, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  Upload as UploadIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";
import { toast } from "sonner";
import type { UserProfile, Upload } from "@/types";

interface Props {
  profile?: UserProfile | null;
  loading: boolean;
  onSubmit: (data: any) => void;
}

export function RoadmapGenerateForm({ profile, loading, onSubmit }: Props) {
  const [step, setStep] = useState<number>(1);
  const [catalog, setCatalog] = useState<{ name: string; branches: string[] }[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loadingUploads, setLoadingUploads] = useState<boolean>(true);

  // Form State
  const [university, setUniversity] = useState<string>(profile?.university || "");
  const [semester, setSemester] = useState<number>(profile?.semester || 1);
  const [subject, setSubject] = useState<string>("");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [selectedSyllabusId, setSelectedSyllabusId] = useState<string>("");
  const [examDate, setExamDate] = useState<string>("");
  const [dailyStudyHours, setDailyStudyHours] = useState<number>(2);

  useEffect(() => {
    api.getUniversityCatalog().then((r) => {
      if (r.success && r.data) setCatalog((r.data as typeof catalog) || []);
    });
    
    setLoadingUploads(true);
    api.getUploads().then((r) => {
      if (r.success && r.data) {
        setUploads((r.data as Upload[]) || []);
      }
      setLoadingUploads(false);
    });
  }, [profile]);

  const handleNext = () => {
    if (step === 1 && !university.trim()) {
      toast.error("Please enter or select a university");
      return;
    }
    if (step === 2 && (semester < 1 || semester > 12)) {
      toast.error("Semester must be between 1 and 12");
      return;
    }
    if (step === 3 && !subject.trim()) {
      toast.error("Please enter a subject name");
      return;
    }
    if (step === 6 && !examDate) {
      toast.error("Please select an exam date");
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setStep((s) => s - 1);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      university,
      semester,
      subject,
      topic: "Full Syllabus",
      uploadedMaterialIds: selectedMaterials,
      syllabusPdfId: selectedSyllabusId || undefined,
      examDate,
      dailyStudyHours,
      difficulty: "medium",
      goalType: "exam_preparation"
    });
  };

  const currentUploads = uploads.filter(u => u.id !== selectedSyllabusId);

  return (
    <Card className="glass overflow-hidden border border-border/50 shadow-2xl relative">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-muted">
        <div 
          className="h-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-300"
          style={{ width: `${(step / 8) * 100}%` }}
        />
      </div>

      <CardHeader className="pt-8">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              Build Your Smart Study Roadmap
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Step {step} of 8 — {step === 1 && "Select University"}
              {step === 2 && "Select Semester"}
              {step === 3 && "Name Your Subject"}
              {step === 4 && "Choose Study Materials"}
              {step === 5 && "Link Course Syllabus"}
              {step === 6 && "Set Exam Date"}
              {step === 7 && "Set Daily Hours"}
              {step === 8 && "Review & Launch"}
            </p>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 bg-accent/60 text-accent-foreground rounded-full">
            {Math.round((step / 8) * 100)}% Done
          </span>
        </div>
      </CardHeader>

      <CardContent className="pb-8 pt-2">
        <form onSubmit={handleSubmitForm} className="space-y-6 min-h-[280px] flex flex-col justify-between">
          
          {/* Step 1: University */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-primary/10 p-3.5 rounded-xl border border-primary/20">
                <Building className="h-6 w-6 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Which university are you studying at? We tailor roadmap tasks to match university syllabus patterns.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">University Name *</label>
                <Input
                  list="university-list"
                  placeholder="e.g. GTU, Mumbai University, Delhi University, IIT..."
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="bg-background/50"
                  required
                />
                <datalist id="university-list">
                  {catalog.map((u) => (
                    <option key={u.name} value={u.name} />
                  ))}
                </datalist>
              </div>
            </div>
          )}

          {/* Step 2: Semester */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-primary/10 p-3.5 rounded-xl border border-primary/20">
                <Layers className="h-6 w-6 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  What semester are you currently in? This aligns the difficulty and module sequence of the study plan.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Semester (1-12) *</label>
                <select
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-background/50 p-2.5 text-sm"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Subject */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-primary/10 p-3.5 rounded-xl border border-primary/20">
                <BookOpen className="h-6 w-6 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  What subject is this study plan for? e.g. Data Structures, Quantum Physics, Macroeconomics.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Subject Title *</label>
                <Input
                  placeholder="e.g. Data Structures & Algorithms"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-background/50"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 4: Study Materials */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-primary/10 p-3.5 rounded-xl border border-primary/20">
                <FileText className="h-6 w-6 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Select study materials, lecture slides, or notebooks you uploaded. The AI will index their contents.
                </p>
              </div>
              
              {loadingUploads ? (
                <div className="space-y-2 py-4">
                  <div className="h-10 bg-muted/40 rounded animate-pulse" />
                  <div className="h-10 bg-muted/40 rounded animate-pulse" />
                </div>
              ) : currentUploads.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-xl bg-accent/20">
                  <UploadIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-semibold">No materials uploaded yet</p>
                  <p className="text-xs text-muted-foreground px-4 mt-1">
                    You can proceed without uploads, or head to the <Link href="/uploads" className="text-primary underline font-medium">Uploads section</Link> to add slide notes first.
                  </p>
                </div>
              ) : (
                <div className="max-h-[220px] overflow-y-auto space-y-2.5 pr-2">
                  {currentUploads.map((file) => {
                    const isChecked = selectedMaterials.includes(file.id);
                    return (
                      <label
                        key={file.id}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                          isChecked
                            ? "border-primary bg-primary/10 font-medium text-primary shadow-sm"
                            : "border-border hover:border-primary/40 hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMaterials([...selectedMaterials, file.id]);
                            } else {
                              setSelectedMaterials(selectedMaterials.filter((id) => id !== file.id));
                            }
                          }}
                          className="w-4 h-4 accent-primary shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground uppercase">{file.file_type}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Syllabus PDF/PPT */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-primary/10 p-3.5 rounded-xl border border-primary/20">
                <FileText className="h-6 w-6 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  Identify your official university Course Syllabus document. The AI will strictly plan chapters from it.
                </p>
              </div>

              {loadingUploads ? (
                <div className="h-10 bg-muted/40 rounded animate-pulse" />
              ) : uploads.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-xl bg-accent/20">
                  <UploadIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-semibold">No syllabus uploaded yet</p>
                  <p className="text-xs text-muted-foreground px-4 mt-1">
                    Designate your syllabus PDF under the <Link href="/uploads" className="text-primary underline font-medium">Uploads section</Link> to generate highly tailored plans.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="text-sm font-semibold">Select Syllabus Document</label>
                  <select
                    value={selectedSyllabusId}
                    onChange={(e) => setSelectedSyllabusId(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background/50 p-2.5 text-sm"
                  >
                    <option value="">-- Optional: Select Syllabus PDF/PPT --</option>
                    {uploads.map((file) => (
                      <option key={file.id} value={file.id}>
                        {file.file_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Step 6: Exam Date */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-primary/10 p-3.5 rounded-xl border border-primary/20">
                <Calendar className="h-6 w-6 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  When is your final exam? We structure a rigorous revision schedule and lock mock exams in the days leading to it.
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Exam Date *</label>
                <input
                  type="date"
                  value={examDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background/50 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/45"
                  required
                />
              </div>
            </div>
          )}

          {/* Step 7: Study Hours */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-primary/10 p-3.5 rounded-xl border border-primary/20">
                <Clock className="h-6 w-6 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  How many hours per day can you dedicate to studying? We distribute the volume of syllabus topics accordingly.
                </p>
              </div>
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Daily Study Hours</label>
                  <span className="text-xl font-bold text-primary font-mono">{dailyStudyHours}h</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={dailyStudyHours}
                  onChange={(e) => setDailyStudyHours(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground font-mono">
                  <span>0.5 hours</span>
                  <span>6.0 hours</span>
                  <span>12 hours</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Review & Generate */}
          {step === 8 && (
            <div className="space-y-4">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3.5 text-sm shadow-inner">
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2.5">
                  <span className="text-muted-foreground">University:</span>
                  <span className="font-semibold text-foreground text-right">{university}</span>
                  
                  <span className="text-muted-foreground">Semester:</span>
                  <span className="font-semibold text-foreground text-right">Semester {semester}</span>
                  
                  <span className="text-muted-foreground">Subject:</span>
                  <span className="font-semibold text-primary text-right">{subject}</span>
                  
                  <span className="text-muted-foreground">Study Materials:</span>
                  <span className="font-semibold text-foreground text-right">
                    {selectedMaterials.length} file(s) selected
                  </span>
                  
                  <span className="text-muted-foreground">Designated Syllabus:</span>
                  <span className="font-semibold text-foreground text-right truncate max-w-[200px]">
                    {selectedSyllabusId 
                      ? uploads.find(u => u.id === selectedSyllabusId)?.file_name 
                      : "None"}
                  </span>
                  
                  <span className="text-muted-foreground">Target Exam Date:</span>
                  <span className="font-semibold text-foreground text-right">{examDate}</span>
                  
                  <span className="text-muted-foreground">Daily Commitment:</span>
                  <span className="font-semibold text-primary text-right font-mono">{dailyStudyHours}h / day</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center italic">
                Our AI Study Coach will build a syllabus-aware, personalized 4-week roadmap using these exact guidelines.
              </p>
            </div>
          )}

          {/* Wizard Action Controls */}
          <div className="flex justify-between gap-3 pt-6 border-t border-border/40 mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || loading}
              className="flex items-center gap-1.5"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            
            {step === 8 ? (
              <Button
                type="submit"
                variant="gradient"
                disabled={loading}
                className="flex items-center gap-1.5 px-6 shadow-md"
              >
                {loading ? "Building Roadmap..." : "Launch Roadmap"}
                <Sparkles className="h-4 w-4 text-white shrink-0" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="flex items-center gap-1.5 px-6"
              >
                Next
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Button>
            )}
          </div>

        </form>
      </CardContent>
    </Card>
  );
}
