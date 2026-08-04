const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { asyncHandler } = require("../middleware/errorHandler");
const { body } = require("express-validator");
const { getRoot_1, postRoot_2, deleteRoot_3 } = require('../controllers/podController');
const { requirePermission } = require("../middleware/rbac");

router.use(requirePermission(['operations', 'pod']));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../../uploads/pod");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

router.get("/", asyncHandler(getRoot_1));

router.post(
  "/",
  [body("lrNo").notEmpty().withMessage("LR number is required")],
  asyncHandler(postRoot_2)
);

router.delete("/:id", asyncHandler(deleteRoot_3));

module.exports = router;
