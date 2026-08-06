const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, param, validationResult } = require("express-validator");const { getRoot_1, postRoot_2, put_id_3, delete_id_4 } = require('../controllers/citiesController');

const { requirePermission } = require("../middleware/rbac");


const CACHE_KEY = "cities";


router.get(
  "/",
  requirePermission(["masters","cities","cities_data","all"]),
  asyncHandler(getRoot_1














  )
);

router.post(
  "/",
  requirePermission(["masters","cities","all"]),
  [
  body("city").notEmpty().withMessage("City name is required"),
  body("short").
  optional().
  isLength({ max: 10 }).
  withMessage("Short code too long"),
  body("state").optional().isString(),
  body("stateCode").optional().isString()],

  asyncHandler(postRoot_2












  )
);

router.put(
  "/:id",
  requirePermission(["masters","cities","all"]),
  asyncHandler(put_id_3






  )
);

router.delete(
  "/:id",
  requirePermission(["masters","cities","all"]),
  asyncHandler(delete_id_4






  )
);

module.exports = router;
