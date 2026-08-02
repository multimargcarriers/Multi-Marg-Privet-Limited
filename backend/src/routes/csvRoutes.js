const express = require("express");
const router = express.Router();
const { requirePermission } = require("../middleware/rbac");
const { createUploadMiddleware } = require("../middleware/upload");
const csvController = require("../controllers/csvController");

const csvUpload = createUploadMiddleware("csv", { maxFileSize: 10 * 1024 * 1024, strictTypes: false });

router.use(requirePermission(["masters", "operations"]));

// GET export CSV
router.get("/export/:module", csvController.exportCSV);

// GET sample CSV
router.get("/sample/:module", csvController.getSample);

// POST import CSV
router.post("/import/:module", csvUpload.single("csvFile"), csvController.importCSV);

module.exports = router;
