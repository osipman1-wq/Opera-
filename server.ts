import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

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
  
  // API Health & Diagnostics
  api.get("/health", (req, res) => {
    res.status(200).json({ 
      status: "alive", 
      time: new Date().toISOString(),
      apiKeyPresent: !!process.env.GEMINI_API_KEY
    });
  });

  api.get("/debug-key", (req, res) => {
    const key = process.env.GEMINI_API_KEY || "";
    res.status(200).json({
      status: key ? "configured" : "missing",
      prefix: key.slice(0, 4),
      length: key.length
    });
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
    console.error(`[Fatal Error] ${req.method} ${req.url}:`, err);
    
    // Always return JSON for API errors
    if (req.url.startsWith("/api") || req.xhr) {
      return res.status(err.status || 500).json({
        error: "Server Error",
        message: err.message || "An unexpected error occurred.",
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
    
    // Default fallback
    res.status(500).send("<h1>Internal Server Error</h1><p>The server encountered an error.</p>");
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
