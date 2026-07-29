const express = require("express");
const router = express.Router();
const { getSystemLogs, deleteLog, deleteLogsByDate, bulkDeleteLogs } = require("../controllers/logs");

const { error } = require("../utils/response");

// Middleware to ensure user is SuperAdmin
const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === "SuperAdmin") {
    next();
  } else {
    return error(res, { message: "Forbidden: SuperAdmin access required", statusCode: 403 });
  }
};

// All authenticated users can access logs


router.get("/", getSystemLogs);

// Only SuperAdmins can delete
router.post("/bulk-delete", requireSuperAdmin, bulkDeleteLogs);
router.delete("/date/:date", requireSuperAdmin, deleteLogsByDate);
router.delete("/:id", requireSuperAdmin, deleteLog);

module.exports = router;
