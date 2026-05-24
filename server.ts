import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

import express from "express";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { generateContent, generateOperaJson } from "./backend/services/aiService.js";
import { initWebLearner, getLearnerStatus } from "./backend/services/webLearner.js";
import authRoutes from "./backend/routes/authRoutes.js";
import contentRoutes from "./backend/routes/contentRoutes.js";
import { initDatabase } from "./backend/dbInit.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "5000", 10);

  // 1. GLOBAL TOP-LEVEL MIDDLEWARES
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  // 2. GLOBAL DIAGNOSTIC LOGGER
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
    next();
  });

  // 2b. STARTUP VALIDATION
  const missingVars: string[] = [];
  if (!process.env.GEMINI_API_KEY) missingVars.push("GEMINI_API_KEY");
  if (!process.env.JWT_SECRET) missingVars.push("JWT_SECRET");
  if (!process.env.DATABASE_URL) missingVars.push("DATABASE_URL");
  if (missingVars.length > 0) {
    console.error(`[FATAL] Missing required environment variables: ${missingVars.join(", ")}`);
    console.error("[FATAL] Article generation will fail until these are set.");
  }

  // 2c. DATABASE INIT (must succeed before routes handle requests)
  try {
    await initDatabase();
  } catch (dbErr: any) {
    console.error("[FATAL] Database initialization failed:", dbErr.message);
  }

  // 3. API ROUTER
  const api = express.Router();
  
  // Health
  api.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "alive", 
      time: new Date().toISOString(),
      apiKeyPresent: !!process.env.GEMINI_API_KEY,
      googleConfigured: !!process.env.GOOGLE_CLIENT_ID
    });
  });

  // Learning status
  api.get("/learning/status", (req, res) => {
    res.json(getLearnerStatus());
  });

  // Auth routes
  api.use("/auth", authRoutes);

  // Content CRUD routes
  api.use("/content", contentRoutes);

  // Single-pass JSON article generator
  api.post("/generate-v2", async (req, res) => {
    const start = Date.now();
    try {
      const { topic, category } = req.body;
      if (!topic || !category) {
        return res.status(400).json({ error: "Missing topic or category" });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "AI service not configured. GEMINI_API_KEY is missing." });
      }
      console.log(`[API /generate-v2] Start: "${topic}" [${category}]`);
      const result = await generateOperaJson({ topic, category });
      console.log(`[API /generate-v2] Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
      return res.json(result);
    } catch (error: any) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.error(`[API /generate-v2] Failed after ${elapsed}s:`, error.message);
      const status = error.message?.includes("quota") || error.message?.includes("rate") ? 429 : 500;
      return res.status(status).json({ error: error.message || "Generation failed" });
    }
  });

  // Generate ebook content via Gemini
  api.post("/generate", async (req, res) => {
    const start = Date.now();
    try {
      const { type, params } = req.body;
      if (!type || !params) {
        return res.status(400).json({ error: "Missing type or params" });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "AI service not configured. GEMINI_API_KEY is missing." });
      }
      console.log(`[API /generate] Start: type=${type}`);
      const result = await generateContent(type, params);
      console.log(`[API /generate] Done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
      return res.json(result);
    } catch (error: any) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.error(`[API /generate] Failed after ${elapsed}s:`, error.message);
      const status = error.message?.includes("quota") || error.message?.includes("rate") ? 429 : 500;
      return res.status(status).json({ error: error.message || "Generation failed" });
    }
  });

  // Strict API 404 — must be LAST inside api router
  api.all("*", (req, res) => {
    console.warn(`[API 404] ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: "API Route Not Found" });
  });

  // Mount API
  app.use("/api", api);

  // 4. FRONTEND / STATIC
  const distPath = path.join(process.cwd(), 'dist');
  const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(distPath);

  if (!isProduction) {
    console.log("[Server] Starting Vite in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Serving static production files from:", distPath);
    app.use(express.static(distPath));
    // Catch-all: serve index.html for any non-API route (client-side routing)
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 5. GLOBAL ERROR HANDLER
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[Fatal Error] ${req.method} ${req.originalUrl}:`, err);
    if (req.originalUrl.startsWith("/api") || req.xhr) {
      return res.status(err.status || 500).json({
        error: "Server Error",
        message: err.message || "An unexpected error occurred.",
      });
    }
    res.status(500).send("<h1>Internal Server Error</h1>");
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API key present: ${!!process.env.GEMINI_API_KEY}`);
    console.log(`Database URL present: ${!!process.env.DATABASE_URL}`);
    initWebLearner();
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
