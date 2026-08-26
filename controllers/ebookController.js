const { generateEbook } = require("../services/ai");
const { fetchReadableText } = require("../utils/fetchSource");

async function createEbook(req, res, next) {
  try {
    const { title, authorName, genre, chapters, description, sourceUrl } = req.body;

    if (!title || !authorName) {
      return res.status(400).json({ success: false, error: "Title and authorName are required" });
    }

    let referenceText = null;
    if (sourceUrl) {
      try {
        referenceText = await fetchReadableText(sourceUrl);
      } catch (err) {
        return res.status(400).json({ success: false, error: `Could not read sourceUrl: ${err.message}` });
      }
    }

    const book = await generateEbook({ title, authorName, genre, chapters, description, referenceText });
    res.json({ success: true, book });
  } catch (err) {
    next(err);
  }
}

module.exports = { createEbook };