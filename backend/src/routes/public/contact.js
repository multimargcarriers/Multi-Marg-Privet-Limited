const express = require("express");
const router = express.Router();
const { asyncHandler } = require("../../middleware/errorHandler");
const { createContact } = require("../../controllers/contactsController");

// Public route to submit contact query
router.post("/", asyncHandler(createContact));

module.exports = router;
