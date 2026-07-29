const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet } = require("../config/redis");const { getRoot_1 } = require('../controllers/misController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["reports","mis_reports"]));


const CACHE_KEY = "mis";

// MIS Report
router.get(
  "/",
  asyncHandler(getRoot_1






















































  )
);

module.exports = router;
