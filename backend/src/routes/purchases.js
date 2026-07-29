const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");const { getRoot_1, postRoot_2, delete_id_3 } = require('../controllers/purchasesController');

const { requirePermission } = require("../middleware/rbac");
router.use(requirePermission(["accounts","purchases"]));


const CACHE_KEY = "purchases";


router.get(
  "/",
  asyncHandler(getRoot_1

















  )
);

router.post(
  "/",
  [
  body("vendor").notEmpty().withMessage("Vendor name is required"),
  body("billNo").notEmpty().withMessage("Vendor Bill No is required"),
  body("date").notEmpty().withMessage("Date is required"),
  body("taxable").isNumeric().withMessage("Taxable Value must be a number"),
  body("gst").isNumeric().withMessage("GST must be a number"),
  body("total").isNumeric().withMessage("Total must be a number")],

  asyncHandler(postRoot_2













  )
);

router.delete(
  "/:id",
  asyncHandler(delete_id_3






  )
);

module.exports = router;
