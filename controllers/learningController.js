const { generateLearningModule } = require("../services/ai");
const { fetchReadableText } = require("../utils/fetchSource");

async function createLearningModule(req, res, next) {
  try {
    const { topic, targetLevel, modulesCount, tone, sourceUrl } = req.body;

    if (!topic) {
      return res.status(400).json({ success: false, error: "Topic is required" });
    }

    let referenceText;
    if (sourceUrl) {
      try {
        referenceText = await fetchReadableText(sourceUrl);
      } catch (err) {
        return res.status(400).json({ success: false, error: `Could not read reference URL: ${err.message}` });
      }
    }

    const learning = await generateLearningModule({
      topic,
      targetLevel,
      modulesCount,
      tone,
      referenceText
    });

    res.json({ success: true, learning });
  } catch (err) {
    next(err);
  }
}

module.exports = { createLearningModule };
