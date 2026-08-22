const express = require("express");
const router = express.Router();
const multer = require("multer");
const { authenticateToken } = require("../middleware/auth");
const { requirePermission } = require("../middleware/rbac");
const { asyncHandler } = require("../middleware/errorHandler");
const webmailController = require("../controllers/webmailController");

// Memory storage for email attachments
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max email size
  }
});

// Protect all webmail routes with token authentication & mail / superadmin permission
router.use(authenticateToken);
router.use(requirePermission(["mail", "email_reports"]));

// Accounts management
router.get("/accounts", asyncHandler(webmailController.getAccounts));
router.post("/accounts", asyncHandler(webmailController.addAccount));
router.delete("/accounts/:id", asyncHandler(webmailController.removeAccount));

// Mailbox folders & status
router.get("/folders", asyncHandler(webmailController.getFolders));

// Messages
router.get("/messages", asyncHandler(webmailController.getMessages));
router.get("/messages/:uid", asyncHandler(webmailController.getMessageDetail));
router.get("/messages/:uid/attachment/:attachmentId", asyncHandler(webmailController.downloadAttachment));

// Actions
router.post("/send", upload.array("attachments", 10), asyncHandler(webmailController.sendMessage));
router.post("/flags", asyncHandler(webmailController.updateFlags));
router.post("/move", asyncHandler(webmailController.moveMessages));
router.delete("/messages", asyncHandler(webmailController.deleteMessages));

module.exports = router;
