const express = require("express");
const router = express.Router();
const tripMisController = require("../controllers/tripMisController");
const { asyncHandler } = require("../middleware/errorHandler");
const { requirePermission } = require("../middleware/rbac");

router.use(requirePermission(["trips", "tripmis", "all"]));

router.get("/", asyncHandler(tripMisController.getRoot_1));
router.post("/", asyncHandler(tripMisController.postRoot_2));
router.put("/:id", asyncHandler(tripMisController.put_id_3));
router.delete("/:id", asyncHandler(tripMisController.delete_id_4));

module.exports = router;
