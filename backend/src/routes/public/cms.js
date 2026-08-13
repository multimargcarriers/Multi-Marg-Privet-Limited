const express = require("express");
const router = express.Router();
const cmsController = require("../../controllers/cmsController");

router.get("/:type", cmsController.getPublicAll);

module.exports = router;
