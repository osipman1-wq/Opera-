import express from "express";
import * as aiService from "../services/aiService.js";

const router = express.Router();

router.post("/generate", async (req, res) => {
  try {
    const { type, params } = req.body;
    
    if (!type || !params) {
      return res.status(400).json({ error: "Missing type or params" });
    }

    const content = await aiService.generateContent(type, params);
    
    let imageUrl = null;
    if (type === 'opera') {
      try {
        imageUrl = await aiService.generateImage(params.topic, content);
      } catch (err) {
        console.error("Image generation failed:", err);
      }
    }

    res.json({ content, imageUrl });
  } catch (error: any) {
    console.error("API error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

export default router;
