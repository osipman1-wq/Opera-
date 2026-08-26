const express = require("express");
const router = express.Router();
const { createEbook } = require("../controllers/ebookController");

router.post("/generate-ebook", createEbook);

module.exports = router;