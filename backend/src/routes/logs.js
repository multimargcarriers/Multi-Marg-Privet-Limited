const express = require("express");
const router = express.Router();
const { getSystemLogs, deleteLog, deleteLogsByDate, bulkDeleteLogs } = require("../controllers/logs");

const { error } = require("../utils/response");

// Middleware to ensure user is SuperAdmin or Admin
const requireSuperAdmin = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (req.user && (role === "superadmin" || role === "admin" || req.user.email === "admin@multimarg.com")) {
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
