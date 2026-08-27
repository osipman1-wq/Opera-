const express = require("express");
const router = express.Router();
const savingsController = require("../controllers/savingsController");

router.get("/savings/account", savingsController.getMyAccount);
router.post("/savings/deposit", savingsController.deposit);
router.post("/savings/withdraw", savingsController.withdraw);
router.post("/savings/accrue-interest", savingsController.accrueInterest);
router.get("/savings/history", savingsController.getHistory);
router.get("/savings/tax-report", savingsController.getTaxReport);
router.post("/savings/lookup", savingsController.lookupAccount);

module.exports = router;
