import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../middleware/auth";
import * as uploadController from "../controllers/uploadController";
import * as summaryController from "../controllers/summaryController";
import * as quizController from "../controllers/quizController";
import * as roadmapController from "../controllers/roadmapController";
import * as paperController from "../controllers/paperController";
import * as analyticsController from "../controllers/analyticsController";
import * as userController from "../controllers/userController";
import * as academicController from "../controllers/academicController";
import { getWeakTopics } from "../services/ai/weakTopicService";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { AuthenticatedRequest } from "../middleware/auth";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.get("/health", (_req, res) => {
  res.json({ success: true, message: "StudyMind API is running" });
});

// Auth
router.post("/auth/send-otp", userController.sendOtp);
router.post("/auth/verify-otp", userController.verifyOtp);
router.post("/auth/resend-otp", userController.resendOtp);
router.post("/auth/send-login-otp", userController.sendLoginOtp);
router.post("/auth/verify-login-otp", userController.verifyLoginOtp);
router.post("/auth/forgot-password", userController.forgotPassword);
router.post("/auth/reset-password", userController.resetPassword);

// User
router.get("/users/profile", authMiddleware, userController.getProfile);
router.post("/users/profile", authMiddleware, userController.createProfile);
router.patch("/users/profile", authMiddleware, userController.updateProfile);

// Uploads
router.post(
  "/uploads",
  authMiddleware,
  upload.single("file"),
  uploadController.uploadFile
);
router.get("/uploads", authMiddleware, uploadController.getUploads);
router.delete("/uploads/:id", authMiddleware, uploadController.deleteUpload);

// Summaries
router.post("/summaries/generate", authMiddleware, summaryController.generateSummaryHandler);
router.get("/summaries", authMiddleware, summaryController.getSummaries);
router.get("/summaries/:id", authMiddleware, summaryController.getSummaryById);

// Quizzes
router.post("/quizzes/generate", authMiddleware, quizController.generateQuizHandler);
router.post("/quizzes/submit", authMiddleware, quizController.submitQuiz);
router.get("/quizzes", authMiddleware, quizController.getQuizzes);
router.get("/quizzes/:id", authMiddleware, quizController.getQuizById);
router.post("/quizzes/:id/retake", authMiddleware, quizController.retakeQuiz);

// Weak topics
router.get("/weak-topics", authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) return sendError(res, "Unauthorized", 401);
    const topics = await getWeakTopics(req.user.id);
    return sendSuccess(res, topics);
  } catch (err) {
    return sendError(res, (err as Error).message, 500);
  }
});

// Roadmaps
router.post("/roadmaps/generate", authMiddleware, roadmapController.generateRoadmapHandler);
router.get("/roadmaps", authMiddleware, roadmapController.getRoadmaps);
router.get("/roadmaps/:id", authMiddleware, roadmapController.getRoadmapById);
router.patch("/roadmaps/:id/progress", authMiddleware, roadmapController.updateRoadmapProgress);
router.post(
  "/roadmaps/tasks/:taskId/verify/prepare",
  authMiddleware,
  roadmapController.prepareTaskVerification
);
router.post(
  "/roadmaps/tasks/:taskId/verify/submit",
  authMiddleware,
  roadmapController.submitTaskVerification
);
router.post(
  "/roadmaps/sessions/:sessionId/end",
  authMiddleware,
  roadmapController.endStudySession
);

// Past papers
router.post(
  "/papers/upload",
  authMiddleware,
  upload.single("file"),
  paperController.uploadPastPaper
);
router.get("/papers", authMiddleware, paperController.getPastPapers);
router.post(
  "/papers/:id/predict",
  authMiddleware,
  paperController.generatePredictedPaperHandler
);
router.post(
  "/papers/predict-subject",
  authMiddleware,
  paperController.generateSubjectPredictionHandler
);
router.get(
  "/papers/predictions",
  authMiddleware,
  paperController.getPredictedPapersHistory
);
router.delete(
  "/papers/predictions/:id",
  authMiddleware,
  paperController.deletePredictedPaper
);

// Multi-paper Collections
router.post(
  "/papers/collections/analyze",
  authMiddleware,
  upload.array("files", 10),
  paperController.createCombinedCollectionHandler
);
router.post(
  "/papers/collections/:collectionId/predict",
  authMiddleware,
  paperController.generatePredictionFromCollectionHandler
);
router.get(
  "/papers/collections",
  authMiddleware,
  paperController.getCollectionsHistoryHandler
);
router.delete(
  "/papers/collections/:id",
  authMiddleware,
  paperController.deleteCollectionHandler
);

// Analytics
router.get("/analytics/dashboard", authMiddleware, analyticsController.getDashboardAnalytics);

// Academic intelligence
router.get("/academic/universities", authMiddleware, academicController.getUniversityCatalog);
router.post("/academic/universities/resolve", authMiddleware, academicController.resolveUniversity);
router.get("/academic/context", authMiddleware, academicController.getAcademicContext);
router.get("/academic/dashboard", authMiddleware, academicController.getAcademicDashboard);
router.get("/academic/materials", authMiddleware, academicController.getMaterialAnalyses);

export default router;
