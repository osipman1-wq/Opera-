const express = require("express");
const router = express.Router();
const { createLearningModule } = require("../controllers/learningController");

router.post("/generate-learning", createLearningModule);

module.exports = router;
