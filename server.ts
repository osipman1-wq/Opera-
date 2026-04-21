import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { generateContent } from "./backend/services/aiService.js";
import { initWebLearner, getLearnerStatus } from "./backend/services/webLearner.js";
import authRoutes from "./backend/routes/authRoutes.js";
import contentRoutes from "./backend/routes/contentRoutes.js";

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

  // Generate content via Gemini (backend only)
  api.post("/generate", async (req, res) => {
    try {
      const { type, params } = req.body;
      if (!type || !params) {
        return res.status(400).json({ error: "Missing type or params" });
      }

      const result = await generateContent(type, params);

      return res.json(result);
    } catch (error: any) {
      console.error("[API /generate] Error:", error);
      return res.status(500).json({ error: "Generation failed", message: error.message });
    }
  });

  // Strict API 404
  api.all("*", (req, res) => {
    console.warn(`[API 404] ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: "API Route Not Found" });
  });

  // Mount API
  app.use("/api", api);

  // 4. FRONTEND / STATIC
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Starting Vite in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Serving static production files...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
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
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
    initWebLearner();
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
