const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getRoot_1 } = require('../controllers/searchController');

router.get(
  "/",
  asyncHandler(getRoot_1














































  )
);

module.exports = router;
