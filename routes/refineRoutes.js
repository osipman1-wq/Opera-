const express = require("express");
const router = express.Router();
const { handleRefine } = require("../controllers/refineController");

router.post("/refine-prompt", handleRefine);

module.exports = router;
