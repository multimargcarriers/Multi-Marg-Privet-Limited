const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { uploadFile } = require("../config/cloudinary");const { getRoot_1, postRoot_2 } = require('../controllers/boxController');

const CACHE_KEY = "boxEntries";


router.get(
  "/",
  asyncHandler(getRoot_1















  )
);

router.post(
  "/",
  [body("description").notEmpty().withMessage("Description is required")],
  asyncHandler(postRoot_2




























  )
);

module.exports = router;
