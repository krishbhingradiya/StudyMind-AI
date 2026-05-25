"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, RefreshCw, AlertTriangle, XCircle, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RoadmapHeader } from "@/components/features/roadmap-header";
import { StudyStats } from "@/components/features/study-stats";
import { ProgressTracker } from "@/components/features/progress-tracker";
import { WeekCard } from "@/components/features/week-card";
import { LoadingSkeleton } from "@/components/features/loading-skeleton";
import { RoadmapGenerateForm } from "@/components/features/roadmap-generate-form";
import { RoadmapVerifyModal } from "@/components/features/roadmap-verify-modal";
import { api } from "@/services/api";
import { useProfile } from "@/hooks/useProfile";
import type { Roadmap, VerifiedRoadmapTask } from "@/types";

const POLLING_INTERVAL_MS = 1500;
const STATUS_MESSAGES = [
  "Reading designated syllabus PDF...",
  "Analyzing chapter weightage and materials...",
  "Structuring 4-week conceptual modules...",
  "Mapping active timer verification milestones...",
  "Creating active mini quiz questions...",
  "Readying your personalized study coach..."
];

export default function RoadmapPage() {
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  const [activeRoadmapId, setActiveRoadmapId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<number>(1);

  // Background polling state
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [pollCounter, setPollCounter] = useState(0);
  const [statusMessageIdx, setStatusMessageIdx] = useState(0);

  // Cycling generation message interval
  useEffect(() => {
    if (!pollingId) return;
    const interval = setInterval(() => {
      setStatusMessageIdx((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [pollingId]);

  // Fetch all roadmaps list
  const {
    data: roadmapsList,
    isLoading: isLoadingList,
    refetch: refetchList,
    error: listError
  } = useQuery({
    queryKey: ["roadmaps"],
    queryFn: async () => {
      const res = await api.getRoadmaps();
      if (!res.success) throw new Error(res.error || "Failed to fetch roadmaps");
      return (res.data as Roadmap[]) || [];
    }
  });

  // Set the first available roadmap as active initially
  useEffect(() => {
    if (roadmapsList && roadmapsList.length > 0 && !activeRoadmapId && !pollingId) {
      setActiveRoadmapId(roadmapsList[0].id);
    }
  }, [roadmapsList, activeRoadmapId, pollingId]);

  // Fetch active roadmap detailed content
  const {
    data: activeRoadmap,
    isLoading: isLoadingDetail,
    refetch: refetchDetail,
    isRefetching: isRefetchingDetail
  } = useQuery({
    queryKey: ["roadmap", activeRoadmapId],
    queryFn: async () => {
      if (!activeRoadmapId) return null;
      const res = await api.getRoadmap(activeRoadmapId);
      if (!res.success) throw new Error(res.error || "Failed to fetch roadmap detail");
      return res.data as Roadmap;
    },
    enabled: !!activeRoadmapId
  });

  // Polling detailed query
  useEffect(() => {
    if (!pollingId) return;

    const timer = setTimeout(async () => {
      try {
        const res = await api.getRoadmap(pollingId);
        if (res.success && res.data) {
          const fetchedRoadmap = res.data as Roadmap;
          
          if (fetchedRoadmap.status === "ready") {
            setPollingId(null);
            setPollCounter(0);
            setActiveRoadmapId(fetchedRoadmap.id);
            // Invalidate React Query cache to live-reload everything
            queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
            queryClient.invalidateQueries({ queryKey: ["roadmap", fetchedRoadmap.id] });
            toast.success("AI Study Roadmap compiled successfully!");
          } else if (fetchedRoadmap.status === "failed") {
            setPollingId(null);
            setPollCounter(0);
            toast.error("Roadmap generation failed. Please try again with shorter materials.");
          } else {
            // Still compiling, increment counter and trigger another poll
            setPollCounter((c) => c + 1);
            if (pollCounter > 60) {
              setPollingId(null);
              toast.error("Generation exceeded limit. Refresh the page to check status.");
            }
          }
        }
      } catch (err) {
        console.warn("Polling error:", err);
      }
    }, POLLING_INTERVAL_MS);

    return () => clearTimeout(timer);
  }, [pollingId, pollCounter, queryClient]);

  // Roadmap generation mutation
  const generateMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.generateRoadmap(formData);
      if (!res.success) throw new Error(res.error || "Failed to initiate roadmap generation");
      return res.data;
    },
    onSuccess: (data: any) => {
      const queuedId = data?.roadmapId;
      if (queuedId) {
        setPollingId(queuedId);
        setShowForm(false);
        setStatusMessageIdx(0);
        setPollCounter(0);
        toast.loading("Analyzing course syllabus & files. Compiling 4-week roadmap...", {
          id: "roadmap-gen",
          duration: 10000
        });
      } else {
        toast.dismiss("roadmap-gen");
        toast.success("Roadmap compiled successfully!");
        queryClient.invalidateQueries({ queryKey: ["roadmaps"] });
      }
    },
    onError: (err: any) => {
      toast.dismiss("roadmap-gen");
      toast.error(err.message || "Failed to generate roadmap");
    }
  });

  const handleCreateNewClick = () => {
    setShowForm(true);
  };

  const handleCancelClick = () => {
    if (roadmapsList && roadmapsList.length > 0) {
      setShowForm(false);
    } else {
      toast.error("You must generate your first study roadmap to begin.");
    }
  };

  const handleVerifyCompleted = (updatedRoadmap: Roadmap) => {
    queryClient.setQueryData(["roadmap", activeRoadmapId], updatedRoadmap);
    queryClient.invalidateQueries({ queryKey: ["roadmap", activeRoadmapId] });
    refetchList();
  };

  // State to hold the active task for validation popup modal
  const [verifyTask, setVerifyTask] = useState<VerifiedRoadmapTask | null>(null);

  // Loading States
  const isCurrentlyGenerating = !!pollingId;
  const isGlobalLoading = isLoadingList || (isLoadingDetail && !activeRoadmap) || generateMutation.isPending;

  if (isCurrentlyGenerating) {
    return (
      <div className="mx-auto max-w-4xl space-y-8 pb-12">
        <RoadmapHeader
          title="Compiling Roadmap..."
          hasRoadmap={false}
          onNewClick={() => {}}
        />
        <LoadingSkeleton 
          isGenerating={true} 
          statusMessage={STATUS_MESSAGES[statusMessageIdx]} 
        />
      </div>
    );
  }

  if (isGlobalLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-8 pb-12">
        <RoadmapHeader
          title="Loading..."
          hasRoadmap={false}
          onNewClick={() => {}}
        />
        <LoadingSkeleton isGenerating={false} />
      </div>
    );
  }

  if (listError || (!roadmapsList?.length && !showForm)) {
    return (
      <div className="mx-auto max-w-4xl space-y-8 pb-12">
        <RoadmapHeader
          title="AI Verified Study Roadmap"
          hasRoadmap={false}
          onNewClick={() => {}}
        />
        <Card className="glass border-rose-500/20 bg-rose-500/5 p-8 text-center rounded-2xl shadow-lg">
          <XCircle className="mx-auto h-12 w-12 text-rose-500 mb-3 animate-pulse" />
          <h3 className="text-xl font-extrabold text-foreground">No active roadmap found</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            You haven't compiled a syllabus roadmap yet. Create one now to begin your personalized verification track!
          </p>
          <Button variant="gradient" onClick={() => setShowForm(true)} className="mt-5 px-6 font-semibold shadow">
            Create Syllabus Roadmap
          </Button>
        </Card>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleCancelClick} className="flex items-center gap-1 text-muted-foreground font-semibold">
            <ArrowLeft className="h-4 w-4" />
            Back to Active Roadmap
          </Button>
          <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Plan Creator</span>
        </div>
        <RoadmapGenerateForm
          profile={profile}
          loading={generateMutation.isPending}
          onSubmit={(data) => generateMutation.mutate(data)}
        />
      </div>
    );
  }

  const tasks = (activeRoadmap?.tasks || []) as VerifiedRoadmapTask[];
  const completedCount = tasks.filter((t) => t.completion_status === "completed").length;
  const dailyHours = activeRoadmap?.daily_study_hours || 2;
  const estimatedHours = activeRoadmap?.config?.estimatedStudyHours || Math.round(4 * 7 * dailyHours * 0.8);
  const weakTopics = activeRoadmap?.config?.weakTopics || [];

  // Group tasks by week (1 to 4)
  const tasksByWeek: Record<number, VerifiedRoadmapTask[]> = { 1: [], 2: [], 3: [], 4: [] };
  tasks.forEach((t) => {
    const w = Number(t.metadata?.week) || 1;
    if (tasksByWeek[w]) tasksByWeek[w].push(t);
    else tasksByWeek[1].push(t);
  });

  const phases = [
    { name: "Week 1: Foundation Phase", desc: "Build core syllabus axioms and review foundations." },
    { name: "Week 2: Advanced Phase", desc: "Tackle deep conceptual structures, code guides, and practical exercises." },
    { name: "Week 3: Mastery Phase", desc: "Target identified weak performance topics and execute flashcards." },
    { name: "Week 4: Peak Phase", desc: "Complete timed mock exams and lock comprehensive active recall blocks." },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      
      {/* Header */}
      <RoadmapHeader
        title={activeRoadmap?.title || "Compiling roadmap..."}
        subject={activeRoadmap?.subject}
        topic={activeRoadmap?.topic}
        examDate={activeRoadmap?.exam_date}
        hasRoadmap={!!activeRoadmap}
        onNewClick={handleCreateNewClick}
      />

      {activeRoadmap && (
        <>
          {/* Progress linear tracking card */}
          <ProgressTracker
            progressPercentage={activeRoadmap.progress_percentage ?? 0}
            examReadiness={activeRoadmap.exam_readiness ?? 0}
          />

          {/* Detailed stats grids */}
          <StudyStats
            completedCount={completedCount}
            totalCount={tasks.length}
            estimatedHours={estimatedHours}
            masteryScore={activeRoadmap.mastery_score ?? 0}
            examReadiness={activeRoadmap.exam_readiness ?? 0}
            weakTopics={weakTopics}
            enhancements={activeRoadmap.config?.enhancements}
          />

          {/* Interactive accordion timeline block */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xl font-extrabold text-foreground tracking-tight">Interactive 4-Week Path</h3>
            
            <div className="space-y-4">
              {[1, 2, 3, 4].map((wk) => {
                const weekTasks = tasksByWeek[wk] || [];
                const scheduleInfo = activeRoadmap.revision_schedule?.find((r) => Number(r.week) === wk);
                const weekTitle = phases[wk - 1].name;
                const weekDesc = phases[wk - 1].desc;

                return (
                  <WeekCard
                    key={wk}
                    weekNum={wk}
                    weekTasks={weekTasks}
                    expandedWeek={expandedWeek}
                    onExpandToggle={setExpandedWeek}
                    scheduleInfo={scheduleInfo}
                    phaseTitle={weekTitle}
                    phaseDesc={weekDesc}
                    onVerify={setVerifyTask}
                  />
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Task verification modal overlay */}
      {verifyTask && (
        <RoadmapVerifyModal
          task={verifyTask}
          onClose={() => setVerifyTask(null)}
          onComplete={handleVerifyCompleted}
        />
      )}
    </div>
  );
}
