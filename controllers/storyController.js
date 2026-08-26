const { generateStory } = require("../services/ai");
const { fetchReadableText } = require("../utils/fetchSource");

async function createStory(req, res, next) {
  try {
    const { title, authorName, genre, length, characters, plot, sourceUrl } = req.body;

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

    const story = await generateStory({ title, authorName, genre, length, characters, plot, referenceText });
    res.json({ success: true, story });
  } catch (err) {
    next(err);
  }
}

module.exports = { createStory };