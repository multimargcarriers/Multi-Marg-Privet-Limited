const express = require("express");
const router = express.Router();
const { db } = require("../config/database");
const { success, error, created } = require("../utils/response");
const { asyncHandler } = require("../middleware/errorHandler");

const {
  getRoot_1,
  postRoot_2,
  put_id_3,
  delete_id_4,
  getAllUserActivities,
  deleteSingleUserActivity,
  bulkDeleteUserActivities,
  clearAllUserActivities,
  clearUserSessions,
  clearUserActivity,
  changeEmployeePassword
} = require('../controllers/usersController');

const isSuperAdminUser = (u) => {
  if (!u) return false;
  const role = String(u.role || '').toLowerCase();
  return role === 'superadmin' || role === 'admin' || u.email === 'admin@multimarg.com';
};

const requireSuperAdmin = (req, res, next) => {
  if (isSuperAdminUser(req.user)) {
    next();
  } else {
    return error(res, { message: "Forbidden: SuperAdmin access required", statusCode: 403 });
  }
};

const requireSuperAdminOrAccounts = (req, res, next) => {
  if (isSuperAdminUser(req.user)) {
    return next();
  }
  const userPermissions = req.user?.permissions || [];
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

// Activity Logs routes
router.get("/activity", asyncHandler(getAllUserActivities));
router.post("/activity/bulk-delete", asyncHandler(bulkDeleteUserActivities));
router.post("/activity/clear-all", asyncHandler(clearAllUserActivities));
router.delete("/activity/:id", asyncHandler(deleteSingleUserActivity));

// Employee Session clearing
router.delete("/:id/sessions", asyncHandler(clearUserSessions));
router.delete("/:id/activity", asyncHandler(clearUserSessions));

// POST direct change password for employee by Super Admin (No OTP, no old pass)
router.post("/:id/change-password", asyncHandler(changeEmployeePassword));

// POST create new user (Admin)
router.post(
  "/",
  asyncHandler(postRoot_2)
);

// PUT update user permissions/role
router.put(
  "/:id",
  asyncHandler(put_id_3)
);

// DELETE user
router.delete(
  "/:id",
  asyncHandler(delete_id_4)
);

module.exports = router;
