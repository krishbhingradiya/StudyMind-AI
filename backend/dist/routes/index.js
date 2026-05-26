"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const uploadController = __importStar(require("../controllers/uploadController"));
const summaryController = __importStar(require("../controllers/summaryController"));
const quizController = __importStar(require("../controllers/quizController"));
const roadmapController = __importStar(require("../controllers/roadmapController"));
const paperController = __importStar(require("../controllers/paperController"));
const analyticsController = __importStar(require("../controllers/analyticsController"));
const userController = __importStar(require("../controllers/userController"));
const academicController = __importStar(require("../controllers/academicController"));
const weakTopicService_1 = require("../services/ai/weakTopicService");
const apiResponse_1 = require("../utils/apiResponse");
const env_1 = require("../config/env");
const auth_2 = __importDefault(require("./auth"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
});
router.get("/health", (_req, res) => {
    res.json({ success: true, message: "StudyMind API is running" });
});
// Diagnostic endpoint to verify environment variable configuration
// Shows which vars are configured (without revealing values)
router.get("/debug/config", (_req, res) => {
    const mask = (val) => val ? `✅ SET (${val.length} chars)` : "❌ NOT SET";
    res.json({
        success: true,
        environment: env_1.env.nodeEnv,
        config: {
            SUPABASE_URL: mask(env_1.env.supabaseUrl),
            SUPABASE_SERVICE_ROLE_KEY: mask(env_1.env.supabaseServiceKey),
            SUPABASE_ANON_KEY: mask(env_1.env.supabaseAnonKey),
            RESEND_API_KEY: mask(env_1.env.resendApiKey),
            SMTP_HOST: mask(env_1.env.smtpHost),
            SMTP_USER: mask(env_1.env.smtpUser),
            SMTP_PASS: mask(env_1.env.smtpPass),
            FRONTEND_URL: env_1.env.frontendUrl || "NOT SET",
            GEMINI_API_KEY: mask(env_1.env.geminiApiKey),
        },
    });
});
// Auth
router.use("/auth", auth_2.default);
// User
router.get("/users/profile", auth_1.authMiddleware, userController.getProfile);
router.post("/users/profile", auth_1.authMiddleware, userController.createProfile);
router.patch("/users/profile", auth_1.authMiddleware, userController.updateProfile);
// Uploads
router.post("/uploads", auth_1.authMiddleware, upload.single("file"), uploadController.uploadFile);
router.get("/uploads", auth_1.authMiddleware, uploadController.getUploads);
router.delete("/uploads/:id", auth_1.authMiddleware, uploadController.deleteUpload);
// Summaries
router.post("/summaries/generate", auth_1.authMiddleware, summaryController.generateSummaryHandler);
router.get("/summaries", auth_1.authMiddleware, summaryController.getSummaries);
router.get("/summaries/:id", auth_1.authMiddleware, summaryController.getSummaryById);
// Quizzes
router.post("/quizzes/generate", auth_1.authMiddleware, quizController.generateQuizHandler);
router.post("/quizzes/submit", auth_1.authMiddleware, quizController.submitQuiz);
router.get("/quizzes", auth_1.authMiddleware, quizController.getQuizzes);
router.get("/quizzes/:id", auth_1.authMiddleware, quizController.getQuizById);
router.post("/quizzes/:id/retake", auth_1.authMiddleware, quizController.retakeQuiz);
// Weak topics
router.get("/weak-topics", auth_1.authMiddleware, async (req, res) => {
    try {
        if (!req.user)
            return (0, apiResponse_1.sendError)(res, "Unauthorized", 401);
        const topics = await (0, weakTopicService_1.getWeakTopics)(req.user.id);
        return (0, apiResponse_1.sendSuccess)(res, topics);
    }
    catch (err) {
        return (0, apiResponse_1.sendError)(res, err.message, 500);
    }
});
// Roadmaps
router.post("/roadmaps/generate", auth_1.authMiddleware, roadmapController.generateRoadmapHandler);
router.get("/roadmaps", auth_1.authMiddleware, roadmapController.getRoadmaps);
router.get("/roadmaps/:id", auth_1.authMiddleware, roadmapController.getRoadmapById);
router.patch("/roadmaps/:id/progress", auth_1.authMiddleware, roadmapController.updateRoadmapProgress);
router.post("/roadmaps/tasks/:taskId/verify/prepare", auth_1.authMiddleware, roadmapController.prepareTaskVerification);
router.post("/roadmaps/tasks/:taskId/verify/submit", auth_1.authMiddleware, roadmapController.submitTaskVerification);
router.post("/roadmaps/sessions/:sessionId/end", auth_1.authMiddleware, roadmapController.endStudySession);
// Past papers
router.post("/papers/upload", auth_1.authMiddleware, upload.single("file"), paperController.uploadPastPaper);
router.get("/papers", auth_1.authMiddleware, paperController.getPastPapers);
router.post("/papers/:id/predict", auth_1.authMiddleware, paperController.generatePredictedPaperHandler);
router.post("/papers/predict-subject", auth_1.authMiddleware, paperController.generateSubjectPredictionHandler);
router.get("/papers/predictions", auth_1.authMiddleware, paperController.getPredictedPapersHistory);
router.delete("/papers/predictions/:id", auth_1.authMiddleware, paperController.deletePredictedPaper);
// Multi-paper Collections
router.post("/papers/collections/analyze", auth_1.authMiddleware, upload.array("files", 10), paperController.createCombinedCollectionHandler);
router.post("/papers/collections/:collectionId/predict", auth_1.authMiddleware, paperController.generatePredictionFromCollectionHandler);
router.get("/papers/collections", auth_1.authMiddleware, paperController.getCollectionsHistoryHandler);
router.delete("/papers/collections/:id", auth_1.authMiddleware, paperController.deleteCollectionHandler);
// Analytics
router.get("/analytics/dashboard", auth_1.authMiddleware, analyticsController.getDashboardAnalytics);
// Academic intelligence
router.get("/academic/universities", auth_1.authMiddleware, academicController.getUniversityCatalog);
router.post("/academic/universities/resolve", auth_1.authMiddleware, academicController.resolveUniversity);
router.get("/academic/context", auth_1.authMiddleware, academicController.getAcademicContext);
router.get("/academic/dashboard", auth_1.authMiddleware, academicController.getAcademicDashboard);
router.get("/academic/materials", auth_1.authMiddleware, academicController.getMaterialAnalyses);
exports.default = router;
