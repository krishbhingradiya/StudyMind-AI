"use client";

import { useEffect, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/services/api";


const contextSchema = z.object({
  university: z.string().min(2, "University is required"),
  semester: z.coerce.number().min(1).max(12, "Semester must be 1-12"),
  subject: z.string().min(2, "Subject is required"),
  examDate: z.string().min(1, "Exam date is required"),
  dailyStudyHours: z.coerce.number().min(0.5).max(12, "Study hours must be 0.5-12"),
  examType: z.string().optional(),
  uploadedMaterialIds: z.array(z.string()).default([]),
  syllabusPdfId: z.string().optional(),
});

export type RoadmapContextFormData = z.infer<typeof contextSchema>;

interface Props {
  onSubmit: (data: RoadmapContextFormData) => void;
  loading?: boolean;
}

export function RoadmapContextForm({ onSubmit, loading = false }: Props) {
  const [step, setStep] = useState<
    "university" | "semester" | "subject" | "materials" | "exam" | "hours" | "review"
  >("university");
  const [universities, setUniversities] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [materials, setMaterials] = useState<
    Array<{ id: string; name: string; type: string }>
  >([]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

  const methods = useForm<RoadmapContextFormData>({
    resolver: zodResolver(contextSchema) as any,
    defaultValues: {
      university: "",
      semester: 1,
      subject: "",
      examDate: "",
      dailyStudyHours: 2,
      examType: "end_semester",
      uploadedMaterialIds: [],
    },
  });

  const { register, handleSubmit, watch, formState: { errors } } = methods;
  const currentValues = watch();

  useEffect(() => {
    // Load universities
    api.getUniversityCatalog().then((r) => {
      if (r.success && r.data) {
        const unis = Array.isArray(r.data)
          ? r.data.map((u: any) => u.name)
          : [];
        setUniversities(unis);
      }
    });

    // Load uploaded materials
    api.getAcademicContext().then((r) => {
      if (r.success && r.data) {
        const ctx = r.data as { materials?: Array<{ id: string; file_name: string; file_type: string }> };
        setMaterials(
          ctx.materials?.map((m) => ({
            id: m.id,
            name: m.file_name,
            type: m.file_type,
          })) || []
        );
      }
    });
  }, []);

  // Load subjects based on selected university
  useEffect(() => {
    if (currentValues.university) {
      // In a real app, fetch subjects for this university
      // For now, use some common subjects
      const commonSubjects = [
        "Mathematics",
        "Physics",
        "Chemistry",
        "Biology",
        "Computer Science",
        "English",
        "History",
        "Economics",
        "Psychology",
      ];
      setSubjects(commonSubjects);
    }
  }, [currentValues.university]);

  const handleNext = () => {
    const steps: typeof step[] = [
      "university",
      "semester",
      "subject",
      "materials",
      "exam",
      "hours",
      "review",
    ];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: typeof step[] = [
      "university",
      "semester",
      "subject",
      "materials",
      "exam",
      "hours",
      "review",
    ];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const handleFormSubmit = async (data: RoadmapContextFormData) => {
    data.uploadedMaterialIds = selectedMaterials;
    onSubmit(data);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <Card className="glass max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>
              {step === "university" && "Step 1: Select Your University"}
              {step === "semester" && "Step 2: Select Your Semester"}
              {step === "subject" && "Step 3: Select Subject"}
              {step === "materials" && "Step 4: Uploaded Materials"}
              {step === "exam" && "Step 5: Exam Date & Type"}
              {step === "hours" && "Step 6: Daily Study Hours"}
              {step === "review" && "Step 7: Review & Generate"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: University */}
            {step === "university" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    University
                  </label>
                  {universities.length > 0 ? (
                    <select
                      {...register("university")}
                      className="w-full rounded-lg border border-border bg-background p-2"
                    >
                      <option value="">Select university...</option>
                      {universities.map((uni) => (
                        <option key={uni} value={uni}>
                          {uni}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...register("university")}
                      type="text"
                      placeholder="Enter your university name"
                      className="w-full rounded-lg border border-border bg-background p-2"
                    />
                  )}
                  {errors.university && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.university.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Semester */}
            {step === "semester" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Semester (1-12)
                  </label>
                  <select
                    {...register("semester")}
                    className="w-full rounded-lg border border-border bg-background p-2"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((s) => (
                      <option key={s} value={s}>
                        Semester {s}
                      </option>
                    ))}
                  </select>
                  {errors.semester && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.semester.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Subject */}
            {step === "subject" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Subject
                  </label>
                  {subjects.length > 0 ? (
                    <select
                      {...register("subject")}
                      className="w-full rounded-lg border border-border bg-background p-2"
                    >
                      <option value="">Select subject...</option>
                      {subjects.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...register("subject")}
                      type="text"
                      placeholder="Enter subject name"
                      className="w-full rounded-lg border border-border bg-background p-2"
                    />
                  )}
                  {errors.subject && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.subject.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Materials */}
            {step === "materials" && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select uploaded study materials to include in roadmap generation
                </p>
                {materials.length > 0 ? (
                  <div className="space-y-3">
                    {materials.map((material) => (
                      <label
                        key={material.id}
                        className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMaterials.includes(material.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMaterials([
                                ...selectedMaterials,
                                material.id,
                              ]);
                            } else {
                              setSelectedMaterials(
                                selectedMaterials.filter(
                                  (id) => id !== material.id
                                )
                              );
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div>
                          <p className="font-medium">{material.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {material.type}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No uploaded materials found. Continue to next step.
                  </p>
                )}
              </div>
            )}

            {/* Step 5: Exam */}
            {step === "exam" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Exam Date
                  </label>
                  <input
                    {...register("examDate")}
                    type="date"
                    className="w-full rounded-lg border border-border bg-background p-2"
                  />
                  {errors.examDate && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.examDate.message}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Exam Type
                  </label>
                  <select
                    {...register("examType")}
                    className="w-full rounded-lg border border-border bg-background p-2"
                  >
                    <option value="end_semester">End Semester</option>
                    <option value="mid_semester">Mid Semester</option>
                    <option value="competitive">Competitive</option>
                    <option value="professional">Professional</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 6: Hours */}
            {step === "hours" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Daily Study Hours: {currentValues.dailyStudyHours}h
                  </label>
                  <input
                    {...register("dailyStudyHours")}
                    type="range"
                    min="0.5"
                    max="12"
                    step="0.5"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    How many hours per day can you dedicate to studying?
                  </p>
                </div>
              </div>
            )}

            {/* Step 7: Review */}
            {step === "review" && (
              <div className="space-y-4">
                <div className="bg-accent/50 rounded-lg p-4 space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">University:</p>
                    <p className="font-semibold">{currentValues.university}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Semester:</p>
                    <p className="font-semibold">{currentValues.semester}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Subject:</p>
                    <p className="font-semibold">{currentValues.subject}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Exam Date:</p>
                    <p className="font-semibold">{currentValues.examDate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Daily Study Hours:</p>
                    <p className="font-semibold">{currentValues.dailyStudyHours}h</p>
                  </div>
                  {selectedMaterials.length > 0 && (
                    <div>
                      <p className="text-muted-foreground">Materials Selected:</p>
                      <p className="font-semibold">{selectedMaterials.length}</p>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Your personalized roadmap will be generated based on these
                  preferences.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={step === "university"}
              >
                Back
              </Button>
              {step === "review" ? (
                <Button
                  type="submit"
                  variant="gradient"
                  disabled={loading}
                >
                  {loading ? "Generating..." : "Generate Roadmap"}
                </Button>
              ) : (
                <Button type="button" onClick={handleNext}>
                  Next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </FormProvider>
  );
}
