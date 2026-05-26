"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            env_1.env.frontendUrl,
            "http://localhost:3000",
            "http://localhost:5173",
        ].filter(Boolean);
        const normalizedOrigin = origin.replace(/\/$/, "");
        const isAllowed = allowedOrigins.some((allowed) => allowed.replace(/\/$/, "") === normalizedOrigin);
        // Allow Vercel deployment and preview subdomains
        const isVercel = normalizedOrigin.endsWith(".vercel.app") || normalizedOrigin.includes(".vercel.app");
        if (isAllowed || isVercel) {
            callback(null, true);
        }
        else {
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
}));
app.use((0, morgan_1.default)(env_1.env.nodeEnv === "development" ? "dev" : "combined"));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "Backend running successfully",
    });
});
app.use("/api", routes_1.default);
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
exports.default = app;
