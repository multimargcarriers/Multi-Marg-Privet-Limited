const express = require("express");
const router = express.Router();
const vendorMisController = require("../controllers/vendorMisController");
const { asyncHandler } = require("../middleware/errorHandler");
const { requirePermission } = require("../middleware/rbac");

router.use(requirePermission(["vendormis", "all"]));

router.get("/", asyncHandler(vendorMisController.getRoot_1));
router.post("/", asyncHandler(vendorMisController.postRoot_2));
router.put("/:id", asyncHandler(vendorMisController.put_id_3));
router.post("/:id/remarks", asyncHandler(vendorMisController.addRemark_5));
router.delete("/:id", asyncHandler(vendorMisController.delete_id_4));

module.exports = router;
