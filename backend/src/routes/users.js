const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error, created } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");

const { v4: uuidv4 } = require("uuid");

// Initialize mock users if needed

// Middleware to ensure user is SuperAdmin
const { getRoot_1, postRoot_2, put_id_3, delete_id_4, getAllUserActivities, clearUserActivity } = require('../controllers/usersController');
const requireSuperAdmin = (req, res, next) => {
  if (req.user && (req.user.role === "SuperAdmin" || req.user.email === "admin@multimarg.com")) {
    next();
  } else {
    return error(res, { message: "Forbidden: SuperAdmin access required", statusCode: 403 });
  }
};

const requireSuperAdminOrAccounts = (req, res, next) => {
  if (req.user && (req.user.role === "SuperAdmin" || req.user.email === "admin@multimarg.com")) {
    return next();
  }
  const userPermissions = req.user.permissions || [];
  if (userPermissions.includes('all') || userPermissions.includes('accounts') || userPermissions.includes('cash_sheet')) {
    return next();
  }
  return error(res, { message: "Forbidden: SuperAdmin or Accounts access required", statusCode: 403 });
};

// Protect GET all users route for SuperAdmin or Accounts
router.get(
  "/",
  requireSuperAdminOrAccounts,
  asyncHandler(getRoot_1)
);

// Protect all subsequent user routes strictly for SuperAdmin
router.use(requireSuperAdmin);

// GET all user activities
router.get("/activity", asyncHandler(getAllUserActivities));

// DELETE user activity
router.delete("/activity/:id", asyncHandler(clearUserActivity));

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
