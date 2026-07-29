const fs = require('fs');

let f = fs.readFileSync('src/routes/print.js', 'utf8');

// Remove duplicate express imports
f = f.replace("const express = require(\"express\");\nconst router = express.Router();\nconst express = require(\"express\");\nconst router = express.Router();", "const express = require(\"express\");\nconst router = express.Router();");

// Fix the missing router.get for lr/:id
let target = `const { get_lr_id_1, get_lr_id_pdf_2, get_bill_id_3, get_manifest_id_4, get_manifest_id_pdf_5, get_trip_bill_trip_client_6 } = require('../controllers/printController');
const { requirePermission } = require("../middleware/rbac");

router.use(requirePermission(["billing","reports"]));

`;

let replacement = `const { get_lr_id_1, get_lr_id_pdf_2, get_bill_id_3, get_manifest_id_4, get_manifest_id_pdf_5, get_trip_bill_trip_client_6 } = require('../controllers/printController');
const { requirePermission } = require("../middleware/rbac");

router.use(requirePermission(["billing","reports"]));

router.get(
  "/lr/:id",
  asyncHandler(get_lr_id_1`;

f = f.replace(target, replacement);

fs.writeFileSync('src/routes/print.js', f);
