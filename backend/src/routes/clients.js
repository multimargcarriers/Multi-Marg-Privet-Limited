const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { success, created, error } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { getOrSet, delCache } = require("../config/redis");
const { body, validationResult } = require("express-validator");
const { getRoot_1, postRoot_2, put_id_3, delete_id_4, deleteAll } = require('../controllers/clientsController');

const { requirePermission } = require("../middleware/rbac");


const CACHE_KEY = "clients";

// Get all clients
router.get(
  "/",
  requirePermission(["masters","clients","clients_data","trips","all"]),
  asyncHandler(getRoot_1)
);

// Create client
router.post(
  "/",
  requirePermission(["masters","clients","all"]),
  [
    body("name").notEmpty().withMessage("Client name is required")
  ],
  asyncHandler(postRoot_2)
);

// Update client
router.put(
  "/:id",
  requirePermission(["masters","clients","all"]),
  asyncHandler(put_id_3)
);

// Delete all clients
router.delete(
  "/all",
  asyncHandler(deleteAll)
);

// Delete client
router.delete(
  "/:id",
  requirePermission(["masters","clients","all"]),
  asyncHandler(delete_id_4)
);

module.exports = router;
