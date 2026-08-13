const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../middleware/errorHandler");
const { 
  getAllApplications, 
  updateApplicationStatus, 
  deleteApplication 
} = require("../controllers/applicationsController");
const { authenticateToken } = require("../middleware/auth");
const { requirePermission } = require("../middleware/rbac");

// All routes require superadmin permission
router.use(authenticateToken);
router.use(requirePermission("superadmin"));

// Get all applications
router.get("/", asyncHandler(getAllApplications));

// Update application status
router.put("/:id", asyncHandler(updateApplicationStatus));

// Delete an application
router.delete("/:id", asyncHandler(deleteApplication));

module.exports = router;
