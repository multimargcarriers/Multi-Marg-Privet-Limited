const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error, created } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");
const { authenticateToken } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");

// Initialize mock users if needed

// Middleware to ensure user is SuperAdmin
const { getRoot_1, postRoot_2, put_id_3, delete_id_4 } = require('../controllers/usersController');const requireSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === "SuperAdmin") {
    next();
  } else {
    return error(res, { message: "Forbidden: SuperAdmin access required", statusCode: 403 });
  }
};

// Protect all user routes
router.use(authenticateToken);
router.use(requireSuperAdmin);

// GET all users
router.get(
  "/",
  asyncHandler(getRoot_1









  )
);

// POST create new user (Admin)
router.post(
  "/",
  asyncHandler(postRoot_2























  )
);

// PUT update user permissions/role
router.put(
  "/:id",
  asyncHandler(put_id_3













  )
);

// DELETE user
router.delete(
  "/:id",
  asyncHandler(delete_id_4












  )
);

module.exports = router;
