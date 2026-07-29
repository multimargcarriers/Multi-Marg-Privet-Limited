const fs = require('fs');
let content = fs.readFileSync('src/routes/print.js', 'utf8');

content = content.replace("const { get_lr_id_1, get_lr_id_pdf_2, get_bill_id_3, get_manifest_id_4, get_manifest_id_pdf_5, get_trip_bill_trip_client_6 } = require('../controllers/printController');router.get(\n\nconst { requirePermission } = require(\"../middleware/rbac\");\nrouter.use(requirePermission([\"billing\",\"reports\"]));\n\n  \"/lr/:id\",", "const { get_lr_id_1, get_lr_id_pdf_2, get_bill_id_3, get_manifest_id_4, get_manifest_id_pdf_5, get_trip_bill_trip_client_6 } = require('../controllers/printController');\nconst { requirePermission } = require(\"../middleware/rbac\");\n\nrouter.use(requirePermission([\"billing\",\"reports\"]));\n\nrouter.get(\n  \"/lr/:id\",");

fs.writeFileSync('src/routes/print.js', content);
