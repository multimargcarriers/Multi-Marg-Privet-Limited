const express = require("express");
const router = express.Router();
const { getSystemLogs } = require("../controllers/logs");
const { authenticateToken } = require("../middleware/auth");
const { error } = require("../utils/response");

// Middleware to ensure user is SuperAdmin
const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === "SuperAdmin") {
    next();
  } else {
    return error(res, { message: "Forbidden: SuperAdmin access required", statusCode: 403 });
  }
};

// Only SuperAdmin can access system logs
router.use(authenticateToken);
router.use(requireSuperAdmin);

router.get("/", getSystemLogs);

module.exports = router;
