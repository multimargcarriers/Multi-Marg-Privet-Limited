const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");const { getRoot_1, postRoot_2, delete_id_3 } = require('../controllers/cashController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["accounts","cash_sheet"]));


const CACHE_KEY = "cashEntries";


router.get(
  "/",
  asyncHandler(getRoot_1















  )
);

router.post(
  "/",
  [
  body("amount").isNumeric().withMessage("Amount must be a number"),
  body("type").isIn(["in", "out"]).withMessage("Type must be in or out")],

  asyncHandler(postRoot_2













  )
);

router.delete(
  "/:id",
  asyncHandler(delete_id_3






  )
);

module.exports = router;
