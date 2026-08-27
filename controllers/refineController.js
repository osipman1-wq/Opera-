const { refinePrompt } = require("../services/ai");

async function handleRefine(req, res, next) {
  try {
    const { prompt, type } = req.body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ success: false, error: "Please enter a topic or concept to refine." });
    }

    const result = await refinePrompt({ prompt, type });
    res.json({ success: true, refined: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { handleRefine };
