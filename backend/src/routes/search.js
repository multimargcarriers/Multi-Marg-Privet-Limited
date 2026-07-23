const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { authenticateToken } = require("../middleware/auth");const { getRoot_1 } = require('../controllers/searchController');

router.get(
  "/",
  authenticateToken,
  asyncHandler(getRoot_1














































  )
);

module.exports = router;
