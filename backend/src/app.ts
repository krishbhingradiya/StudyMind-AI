import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import routes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
const allowedOrigins = [
  env.frontendUrl,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean);

console.log("[CORS] Allowed origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, "");
      const isAllowed = allowedOrigins.some(
        (allowed) => allowed.replace(/\/+$/, "") === normalizedOrigin
      );

      // Allow Vercel deployment and preview subdomains
      const isVercel = normalizedOrigin.endsWith(".vercel.app");

      if (isAllowed || isVercel) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["set-cookie"],
    optionsSuccessStatus: 200,
  })
);
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Backend running successfully",
  });
});

app.use("/api", routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
