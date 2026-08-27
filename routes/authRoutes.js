const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.post("/auth/register", authController.register);
router.post("/auth/login", authController.login);
router.get("/auth/me", authController.getMe);
router.post("/auth/logout", authController.logout);

module.exports = router;
