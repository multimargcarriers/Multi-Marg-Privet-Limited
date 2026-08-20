const express = require("express");
const router = express.Router();
const openingBalanceController = require("../controllers/openingBalanceController");

// List opening balances
router.get("/", openingBalanceController.getOpeningBalances);

// Create manual opening balance
router.post("/", openingBalanceController.createOpeningBalance);

// Update opening balance
router.put("/:id", openingBalanceController.updateOpeningBalance);

// Delete opening balance
router.delete("/:id", openingBalanceController.deleteOpeningBalance);

// Financial Year Close & Archival Action
router.post("/close-fy", openingBalanceController.closeFinancialYear);

module.exports = router;
