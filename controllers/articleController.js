const { generateArticle } = require("../services/ai");
const { fetchReadableText } = require("../utils/fetchSource");

async function createArticle(req, res, next) {
  try {
    const { topic, keywords, sourceUrl } = req.body;

    if (!topic) {
      return res.status(400).json({ success: false, error: "Topic is required" });
    }

    let referenceText = null;
    if (sourceUrl) {
      try {
        referenceText = await fetchReadableText(sourceUrl);
      } catch (err) {
        return res.status(400).json({ success: false, error: `Could not read sourceUrl: ${err.message}` });
      }
    }

    const article = await generateArticle({ topic, keywords, referenceText });
    res.json({ success: true, article });
  } catch (err) {
    next(err);
  }
}

module.exports = { createArticle };