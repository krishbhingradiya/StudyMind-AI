"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Building2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Plus,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Search,
  Trash2,
  Eye,
  RefreshCw,
  Upload,
  X,
  File,
  ChevronRight,
  Award,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PredictedExamPaperView } from "@/components/features/predicted-exam-paper";
import { api } from "@/services/api";
import type { PredictedExamPaper } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface QueueFile {
  id: string;
  file: File;
  year: number;
}

interface Collection {
  id: string;
  subject: string;
  university?: string;
  semester?: string;
  branch?: string;
  total_papers: number;
  confidence_score: number;
  combined_analysis?: {
    confidenceScore: number;
    difficultyAnalysis: { difficulty: "Easy" | "Medium" | "Hard"; reasoning: string };
    repeatedTopics: Array<{ topic: string; frequencyPercentage: number; importance: "High" | "Medium" | "Low" }>;
    chapterWeightage: Array<{ chapter: string; expectedMarks: number; unitLabel: string }>;
    predictedPatterns: Array<{ patternType: string; ratioPercentage: number }>;
    importantQuestionBank: Array<{ questionText: string; estimatedMarks: number; unitTag: string }>;
    examPatternSummary: string;
  };
  created_at: string;
}

const PREDICTION_STEPS = [
  "Initializing premium neural pattern analysis engine...",
  "Parsing and indexing uploaded past paper assets in parallel...",
  "Mapping topic frequency & occurrence recurrence algorithms...",
  "Cross-referencing weightage boundaries & chapter frequencies...",
  "Synthesizing high-precision expected technical exam scenarios...",
  "Aligning strict board marks & dynamic section formatting..."
];

export default function CombinedPapersPage() {
  // --- Collection History ---
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);

  // --- Uploader Configuration State ---
  const [subject, setSubject] = useState("");
  const [university, setUniversity] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [examType, setExamType] = useState("Theory");
  const [totalMarks, setTotalMarks] = useState(70);

  // --- Upload Queue State ---
  const [uploadQueue, setUploadQueue] = useState<QueueFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // --- Process & Generation State ---
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  const [predictedPaper, setPredictedPaper] = useState<PredictedExamPaper | null>(null);
  const [isGeneratingPaper, setIsGeneratingPaper] = useState(false);

  // --- Search / Filters ---
  const [historySearch, setHistorySearch] = useState("");

  // --- Predicted Papers DB History List ---
  const [historyList, setHistoryList] = useState<any[]>([]);

  const loadCollections = async () => {
    const res = await api.getCollectionsHistory();
    if (res.success && res.data) {
      setCollections(res.data as Collection[]);
    }
  };

  const loadHistory = async () => {
    const res = await api.getPredictedPapersHistory();
    if (res.success && res.data) {
      setHistoryList(res.data as any[]);
    }
  };

  const loadAll = async () => {
    await Promise.all([loadCollections(), loadHistory()]);
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Reload history when search changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadCollections();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [historySearch]);

  // --- Cycle prediction loading messages ---
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isProcessing) {
      setLoadingStepIndex(0);
      interval = setInterval(() => {
        setLoadingStepIndex((prev) => (prev + 1) % PREDICTION_STEPS.length);
      }, 3000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing]);

  // --- Drag and Drop Handlers ---
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFilesToQueue(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const newFiles = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      year: new Date().getFullYear(),
    }));
    setUploadQueue((prev) => [...prev, ...newFiles]);
  };

  const removeFileFromQueue = (id: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const updateFileYear = (id: string, year: number) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, year } : item))
    );
  };

  // --- Process Queue upload ---
  const handleProcessCollection = async () => {
    const cleanSub = subject.trim();
    if (!cleanSub) {
      toast.error("Subject is required before initiating pattern intelligence");
      return;
    }
    if (uploadQueue.length === 0) {
      toast.error("Please add at least one past paper/notes asset to the upload queue");
      return;
    }

    setIsProcessing(true);
    setPredictedPaper(null);

    const fd = new FormData();
    uploadQueue.forEach((item) => {
      fd.append("files", item.file);
    });
    fd.append("subject", cleanSub);
    if (university.trim()) fd.append("university", university.trim());
    if (branch.trim()) fd.append("branch", branch.trim());
    if (semester.trim()) fd.append("semester", semester.trim());
    fd.append("years", uploadQueue.map((item) => item.year).join(","));

    const res = await api.analyzeCombinedPapers(fd);
    setIsProcessing(false);

    if (res.success && res.data) {
      const collection = (res.data as any).collection as Collection;
      toast.success("Aggregated academic pattern intelligence dashboard successfully generated!");
      setSelectedCollection(collection);
      setShowInsightsModal(true); // Instantly open the overlay modal to show insights!
      setUploadQueue([]); // Reset uploader queue
      loadAll();
    } else {
      toast.error(res.error || "Failed to analyze document collection");
    }
  };

  // --- Generate Prediction Exam Paper ---
  const handleGeneratePredictedPaper = async (collectionId: string) => {
    setIsGeneratingPaper(true);
    setPredictedPaper(null);

    const res = await api.predictFromCollection(collectionId, { totalMarks });
    setIsGeneratingPaper(false);

    if (res.success && res.data) {
      const paper = (res.data as { paper: PredictedExamPaper }).paper;
      setPredictedPaper(paper);
      setShowInsightsModal(false); // Close insights modal so user sees the newly compiled paper!
      toast.success("Premium Scenario Predicted Paper synthesized and loaded successfully!");
      loadHistory(); // Reload predicted papers history list from DB
      setTimeout(() => {
        document.getElementById("predicted-paper-anchor")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } else {
      toast.error(res.error || "Failed to synthesize prediction sheet");
    }
  };

  // --- Delete Collection Handler ---
  const handleDeleteCollection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await api.deleteCollection(id);
    if (res.success) {
      toast.success("Collection deleted successfully");
      loadCollections();
      if (selectedCollection?.id === id) {
        setSelectedCollection(null);
        setShowInsightsModal(false);
      }
    } else {
      toast.error(res.error || "Failed to delete collection");
    }
  };

  // --- Delete History Handler ---
  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await api.deletePredictedPaper(id);
    if (res.success) {
      toast.success("Predicted paper deleted from history logs");
      loadHistory();
      if (predictedPaper && (predictedPaper as any).id === id) {
        setPredictedPaper(null);
      }
    } else {
      toast.error(res.error || "Failed to delete predicted paper");
    }
  };

  // --- Classroom Card Click: Load past prediction if it exists! (UX refinement) ---
  const handleClassroomClick = (collection: Collection) => {
    // Find the most recently generated paper matching this subject in database history list
    const pastPaper = historyList.find(
      (h) => h.subject.toLowerCase() === collection.subject.toLowerCase()
    );

    if (pastPaper) {
      setPredictedPaper(pastPaper.paper_data);
      toast.success(`Loaded previously generated exam paper for ${collection.subject}`);
      setSelectedCollection(collection);
      setTimeout(() => {
        document.getElementById("predicted-paper-anchor")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    } else {
      // If none generated yet, open insights modal so they can trigger first prediction
      setSelectedCollection(collection);
      setPredictedPaper(null);
      setShowInsightsModal(true);
    }
  };

  const filteredCollections = collections.filter((c) =>
    c.subject.toLowerCase().includes(historySearch.toLowerCase()) ||
    c.university?.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-20 px-4 select-none">
      
      {/* Visual SaaS Cockpit Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-br from-card/30 to-accent/5 p-8 rounded-3xl border border-border/80 shadow-md">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2 text-foreground">
            Multi-Paper Intelligence <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Specify subject parameters and upload multiple papers/syllabuses together. The system will merge files, extract high-yield trends automatically, and prepare a custom predicted exam layout.
          </p>
        </div>
      </div>

      {/* ─── METADATA CONFIG & DRAG DROP QUEUE CARD ─── */}
      <Card className="glass border-primary/20 shadow-lg hover:shadow-primary/5 transition-all rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-border/40 bg-accent/5">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> Create New Combined Intelligence Classroom
          </CardTitle>
          <CardDescription>
            Specify your academic credentials and drag in multiple study sheets, exam guides, or past papers.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          
          {/* Metadata Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Subject Name</label>
              <Input
                placeholder="e.g. Operating Systems"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-background/50 h-10 border-border/80"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">University</label>
              <Input
                placeholder="e.g. Charusat University"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="bg-background/50 h-10 border-border/80"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Branch</label>
              <Input
                placeholder="e.g. Computer Science"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="bg-background/50 h-10 border-border/80"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Semester</label>
              <Input
                placeholder="e.g. V"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="bg-background/50 h-10 border-border/80"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Exam Format</label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full rounded-lg border border-border/80 bg-background/50 p-2 text-sm h-10 focus:ring-1 focus:ring-primary focus:outline-none"
              >
                <option value="Theory">Theory Exam</option>
                <option value="Practical">Practical Lab Exam</option>
                <option value="Objective">Objective Test</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Marks Target</label>
              <Input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(Number(e.target.value))}
                className="bg-background/50 h-10 border-border/80"
              />
            </div>
          </div>

          {/* Interactive Drag & Drop Area */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all duration-200 ${
              isDragging 
                ? "border-primary bg-primary/10 scale-[0.99] shadow-md shadow-primary/5" 
                : "border-border/80 hover:border-primary/50 bg-background/20"
            }`}
            onClick={() => document.getElementById("multi-file-input")?.click()}
          >
            <input
              id="multi-file-input"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.docx,.doc,.txt,.ppt,.pptx"
            />
            <Upload className="mb-2 h-8 w-8 text-primary animate-bounce" />
            <p className="font-bold text-sm text-foreground">Drag and drop past papers together</p>
            <p className="text-xs text-muted-foreground mt-0.5">Supports PDF, PPT, DOCX, TXT (Maximum 10 files together)</p>
          </div>

          {/* Upload Queue Queue list */}
          <AnimatePresence>
            {uploadQueue.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" /> Active Upload Queue ({uploadQueue.length} files)
                </h4>

                <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                  {uploadQueue.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-background/50 border border-border/80 shadow-sm relative overflow-hidden"
                    >
                      <div className="flex items-center gap-3 max-w-[70%]">
                        <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-xs text-foreground truncate">{item.file.name}</p>
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">
                            Size: {(item.file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Year Selector */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground font-bold uppercase">Year:</span>
                          <select
                            className="bg-background border border-border/80 text-[10px] rounded p-1 font-bold focus:outline-none"
                            value={item.year}
                            onChange={(e) => updateFileYear(item.id, Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {Array.from({ length: 15 }).map((_, idx) => {
                              const y = new Date().getFullYear() - idx;
                              return <option key={y} value={y}>{y}</option>;
                            })}
                          </select>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFileFromQueue(item.id);
                          }}
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Queue Actions */}
                <div className="pt-3 border-t border-border/40 flex justify-end">
                  <Button
                    onClick={handleProcessCollection}
                    disabled={!subject.trim() || isProcessing}
                    variant="gradient"
                    className="shadow-md shadow-primary/20 w-full sm:w-auto hover:scale-[1.01] transition-transform"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing Classroom...
                      </>
                    ) : (
                      <>
                        Initialize AI Pattern Intelligence
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </CardContent>
      </Card>

      {/* ─── DYNAMIC STEPS LOADER OVERLAY ─── */}
      {isProcessing && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 z-50 animate-in fade-in duration-300">
          <Card className="max-w-md w-full glass border-primary/20 shadow-2xl p-8 text-center space-y-6 rounded-3xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-40 pointer-events-none" />
            
            <div className="relative w-16 h-16 mx-auto">
              <Loader2 className="w-16 h-16 text-primary animate-spin absolute inset-0" />
              <Sparkles className="w-6 h-6 text-primary animate-bounce absolute top-5 left-5" />
            </div>

            <div className="space-y-2 relative">
              <h3 className="text-xl font-black tracking-tight">Active Classroom Intelligence</h3>
              <p className="text-xs text-muted-foreground">
                Analyzing and forecasting structures for <span className="font-bold text-primary">{subject}</span>.
              </p>
            </div>

            <div className="bg-background border border-border/80 rounded-2xl p-4 font-bold text-xs text-primary flex items-center justify-center min-h-[60px] shadow-sm animate-pulse relative">
              {PREDICTION_STEPS[loadingStepIndex]}
            </div>

            <p className="text-[10px] text-muted-foreground leading-relaxed relative">
              Merging and calculating recurrence topics across all uploads using high-speed context matching. Initial assessment under 10 seconds.
            </p>
          </Card>
        </div>
      )}

      {/* ─── PREMIUM MODAL / FLOATING DRAWER OVERLAY FOR COMBINED INSIGHTS ─── */}
      <AnimatePresence>
        {showInsightsModal && selectedCollection && selectedCollection.combined_analysis && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-in fade-in duration-300">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass border-primary/20 shadow-2xl max-w-4xl w-full rounded-3xl overflow-hidden my-8 relative flex flex-col justify-between"
            >
              
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-background/40 via-accent/10 to-background/40 px-6 py-5 flex items-center justify-between border-b border-border/60">
                <div>
                  <h2 className="text-lg font-black text-foreground flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" /> Multi-Paper Pattern Insights: {selectedCollection.subject}
                  </h2>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                    {selectedCollection.university || "General University"} · {selectedCollection.total_papers} papers analyzed
                  </p>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowInsightsModal(false)}
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Scrollable Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
                
                {/* Dashboard Cockpit Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Prediction Analytics Card */}
                  <div className="glass border-border/80 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-sm relative overflow-hidden bg-gradient-to-br from-card/30 to-accent/5">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
                    <div>
                      <h4 className="text-[10px] font-black tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-4">
                        <TrendingUp className="h-4 w-4 text-primary" /> Prediction Analytics
                      </h4>
                      <div className="flex items-center gap-6">
                        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle cx="48" cy="48" r="40" className="stroke-muted/20" strokeWidth="6" fill="transparent" />
                            <circle cx="48" cy="48" r="40" className="stroke-primary" strokeWidth="6" fill="transparent" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 - (selectedCollection.confidence_score / 100) * 2 * Math.PI * 40} />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-foreground">{selectedCollection.confidence_score}%</span>
                            <span className="text-[8px] text-muted-foreground font-black uppercase tracking-wider">Confidence</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-muted-foreground font-bold uppercase">Certainty Index</div>
                          <p className="text-[11px] font-semibold text-foreground mt-0.5 leading-snug">
                            High accuracy forecast.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-border/60 pt-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground font-bold uppercase">Difficulty Trend:</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold border text-amber-500 bg-amber-500/10 border-amber-500/20">
                          {selectedCollection.combined_analysis.difficultyAnalysis.difficulty}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {selectedCollection.combined_analysis.difficultyAnalysis.reasoning}
                      </p>
                    </div>
                  </div>

                  {/* High-Yield Chapter Weightage Card */}
                  <div className="glass border-border/80 rounded-2xl p-6 shadow-sm bg-gradient-to-br from-card/30 to-accent/5 md:col-span-2 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] font-black tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-4">
                        <BookOpen className="h-4 w-4 text-primary" /> Chapter Marks Expectations
                      </h4>
                      <div className="space-y-4">
                        {selectedCollection.combined_analysis.chapterWeightage.map((ch, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-foreground truncate max-w-[65%]">{ch.chapter}</span>
                              <span className="text-muted-foreground font-bold">
                                Unit: <strong className="text-foreground">{ch.unitLabel}</strong> · Marks: <strong className="text-primary">{ch.expectedMarks}M</strong>
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden flex">
                              <div style={{ width: `${(ch.expectedMarks / 70) * 100}%` }} className="bg-primary h-full rounded-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-border/60 mt-4 pt-3 text-[10px] text-muted-foreground flex items-center gap-1.5 font-bold uppercase">
                      <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> Focus priority on high mark modules.
                    </div>
                  </div>

                  {/* Topic Recurrence & Trend Ratios */}
                  <div className="glass border-border/80 rounded-2xl p-6 shadow-sm bg-gradient-to-br from-card/30 to-accent/5 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-[10px] font-black tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-4">
                        <Clock className="h-4 w-4 text-primary" /> Repeated Topics
                      </h4>
                      <div className="space-y-2">
                        {selectedCollection.combined_analysis.repeatedTopics.slice(0, 3).map((topic, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-background/40 border border-border/50">
                            <span className="text-xs font-bold text-foreground truncate">{topic.topic}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded">
                                {topic.frequencyPercentage}% Recurrent
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-4">
                        <TrendingUp className="h-4 w-4 text-primary animate-pulse" /> Question Style Ratio
                      </h4>
                      <div className="space-y-3">
                        {selectedCollection.combined_analysis.predictedPatterns.map((pat, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-bold text-foreground">{pat.patternType}</span>
                              <span className="text-primary font-bold">{pat.ratioPercentage}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden flex">
                              <div style={{ width: `${pat.ratioPercentage}%` }} className="bg-primary h-full rounded-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Question Radar */}
                  <div className="glass border-border/80 rounded-2xl p-6 shadow-sm bg-gradient-to-br from-card/30 to-accent/5 md:col-span-3">
                    <h4 className="text-[10px] font-black tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 mb-4">
                      <Award className="h-4 w-4 text-primary" /> Expected Question Archetypes
                    </h4>
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                      {selectedCollection.combined_analysis.importantQuestionBank.slice(0, 4).map((q, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-background/50 border border-border/60 flex items-start gap-2.5 text-justify">
                          <span className="text-xs font-black text-primary bg-primary/10 h-5 w-5 rounded flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="space-y-1 w-full">
                            <p className="text-[11px] font-semibold text-foreground leading-relaxed">{q.questionText}</p>
                            <div className="flex justify-between items-center pt-1.5 text-[8px] text-muted-foreground font-black uppercase">
                              <span>Unit: {q.unitTag}</span>
                              <span className="text-primary">{q.estimatedMarks} Marks expected</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

              {/* Modal Footer Controls */}
              <div className="bg-accent/5 px-6 py-4 flex flex-col sm:flex-row justify-end items-center gap-3 border-t border-border/60">
                <Button
                  variant="outline"
                  onClick={() => setShowInsightsModal(false)}
                  className="w-full sm:w-auto rounded-xl text-xs"
                >
                  Close Insights
                </Button>
                
                <Button
                  onClick={() => handleGeneratePredictedPaper(selectedCollection.id)}
                  disabled={isGeneratingPaper}
                  variant="gradient"
                  className="shadow-md shadow-primary/20 w-full sm:w-auto rounded-xl text-xs"
                >
                  {isGeneratingPaper ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Exam Sheet...
                    </>
                  ) : (
                    <>
                      Generate Final predicted Exam Paper
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── PREDICTED EXAM QUESTION PAPER VIEW ─── */}
      {predictedPaper && (
        <div id="predicted-paper-anchor" className="space-y-4 pt-6 border-t border-border/80">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black flex items-center gap-2 text-foreground">
              Predicted Master Exam Paper <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">Synthesized Paper</span>
            </h2>
            <Button onClick={() => setPredictedPaper(null)} variant="outline" size="sm" className="rounded-lg">
              Close Paper
            </Button>
          </div>
          <PredictedExamPaperView paper={predictedPaper} />
        </div>
      )}

      {/* ─── PREVIOUS COLLECTIONS GRID HISTORY (Task 5) ─── */}
      <Card className="glass border-border/80 shadow-lg rounded-3xl overflow-hidden mt-6">
        <CardHeader className="border-b border-border/40 bg-accent/5 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <BookOpen className="h-5 w-5 text-primary" /> Previous Intelligence Classrooms
            </CardTitle>
            <CardDescription>
              Browse your previously analyzed paper collections. Click on a card to instantly load its past predicted paper. Click on &quot;AI Insights&quot; to review the patterns.
            </CardDescription>
          </div>
          
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subjects..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="pl-9 h-10 bg-background/50 border-border/80 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {filteredCollections.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-border/60 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto opacity-35 mb-3" />
              <p className="font-bold text-sm text-foreground/80">No classroom logs matching filter</p>
              <p className="text-xs mt-1">Specify metadata and upload multiple documents together above.</p>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {filteredCollections.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleClassroomClick(item)}
                  className={`flex flex-col justify-between p-5 rounded-2xl border text-left cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md ${
                    selectedCollection?.id === item.id && !showInsightsModal
                      ? "bg-primary/5 border-primary/50 text-primary shadow"
                      : "bg-background/50 border-border/60 hover:border-border text-foreground"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded border border-primary/20">
                        {item.confidence_score}% Confidence
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-foreground">{item.subject}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 font-medium">
                        <Building2 className="h-3.5 w-3.5" /> {item.university || "General University"}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-5 pt-3 border-t border-border/40 text-[10px] text-muted-foreground font-bold uppercase">
                    <span>{item.total_papers} Papers Analyzed</span>
                    
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCollection(item);
                          setPredictedPaper(null);
                          setShowInsightsModal(true);
                        }}
                        className="text-[10px] h-7 px-2.5 rounded-lg text-primary hover:bg-primary/10 border border-primary/10"
                      >
                        AI Insights
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteCollection(item.id, e)}
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
