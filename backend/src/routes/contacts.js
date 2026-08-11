const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../middleware/errorHandler");
const { getContacts, resolveContact, deleteContact } = require("../controllers/contactsController");
const { requirePermission } = require("../middleware/rbac");

// Protected routes for admin
router.use(requirePermission(["dashboard", "admin"]));
router.get("/", asyncHandler(getContacts));
router.put("/:id/resolve", asyncHandler(resolveContact));
router.delete("/:id", asyncHandler(deleteContact));

module.exports = router;
