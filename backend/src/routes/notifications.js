const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");

// Get all incomplete entities
const { get_incomplete_1 } = require('../controllers/notificationsController');router.get(
  "/incomplete",
  asyncHandler(get_incomplete_1





































  )
);

module.exports = router;
