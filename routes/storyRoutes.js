const express = require("express");
const router = express.Router();
const { createStory } = require("../controllers/storyController");

router.post("/generate-story", createStory);

module.exports = router;