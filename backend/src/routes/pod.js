const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { uploadFile } = require("../config/cloudinary");const { getRoot_1, postRoot_2 } = require('../controllers/podController');
const { requirePermission } = require("../middleware/rbac");

const CACHE_KEY = "podEntries";

router.use(requirePermission(['operations', 'pod']));


// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../uploads/pod");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

router.get(
  "/",
  asyncHandler(getRoot_1















  )
);

router.post(
  "/",
  [body("lrNo").notEmpty().withMessage("LR number is required")],
  asyncHandler(postRoot_2
































  )
);

module.exports = router;
