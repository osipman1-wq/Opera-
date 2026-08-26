const express = require("express");
const router = express.Router();
const { createArticle } = require("../controllers/articleController");

router.post("/generate-article", createArticle);

module.exports = router;