const express = require("express");
const router = express.Router();
const cmsController = require("../controllers/cmsController");
const { asyncHandler } = require("../middleware/errorHandler");
const { requirePermission } = require("../middleware/rbac");

// Admin Routes for CMS (Requires generic permission or specific if needed)
router.get("/:type", requirePermission(["all"]), asyncHandler(cmsController.getAll));
router.post("/:type", requirePermission(["all"]), asyncHandler(cmsController.create));
router.put("/:type/:id", requirePermission(["all"]), asyncHandler(cmsController.update));
router.delete("/:type/:id", requirePermission(["all"]), asyncHandler(cmsController.delete));

module.exports = router;
