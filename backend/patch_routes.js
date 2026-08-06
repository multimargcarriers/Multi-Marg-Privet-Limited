const fs = require('fs');
const path = require('path');

function patchRoute(fileName, globalRequirePermStr, getPerms, writePerms) {
  const filePath = path.join(__dirname, 'src', 'routes', fileName);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove the global router.use(...)
  content = content.replace(`router.use(${globalRequirePermStr});\n`, '');
  content = content.replace(`router.use(${globalRequirePermStr})`, '');
  
  // Replace GET /
  content = content.replace(/router\.get\(\s*"\/"\s*,/g, `router.get(\n  "/",\n  requirePermission(${JSON.stringify(getPerms)}),`);
  
  // Replace POST /
  content = content.replace(/router\.post\(\s*"\/"\s*,/g, `router.post(\n  "/",\n  requirePermission(${JSON.stringify(writePerms)}),`);
  
  // Replace PUT /:id
  content = content.replace(/router\.put\(\s*"\/:id"\s*,/g, `router.put(\n  "/:id",\n  requirePermission(${JSON.stringify(writePerms)}),`);
  
  // Replace DELETE /:id
  content = content.replace(/router\.delete\(\s*"\/:id"\s*,/g, `router.delete(\n  "/:id",\n  requirePermission(${JSON.stringify(writePerms)}),`);
  
  // Replace DELETE / (deleteAll)
  content = content.replace(/router\.delete\(\s*"\/"\s*,/g, `router.delete(\n  "/",\n  requirePermission(${JSON.stringify(writePerms)}),`);
  
  fs.writeFileSync(filePath, content);
  console.log(`Patched ${fileName}`);
}

// 1. clients.js
patchRoute(
  'clients.js', 
  'requirePermission(["masters","clients","trips","all"])',
  ["masters", "clients", "clients_data", "trips", "all"],
  ["masters", "clients", "all"]
);

// 2. vendors.js
patchRoute(
  'vendors.js', 
  'requirePermission(["masters","vendors"])',
  ["masters", "vendors", "vendors_data", "all"],
  ["masters", "vendors", "all"]
);

// 3. cities.js
patchRoute(
  'cities.js', 
  'requirePermission(["masters","cities"])',
  ["masters", "cities", "cities_data", "all"],
  ["masters", "cities", "all"]
);

// 4. branches.js
patchRoute(
  'branches.js', 
  'requirePermission(["masters","branches"])',
  ["masters", "branches", "branches_data", "all"],
  ["masters", "branches", "all"]
);

// 5. rates.js
patchRoute(
  'rates.js', 
  'requirePermission(["rates","client_rates"])',
  ["rates", "client_rates", "client_rates_data", "all"],
  ["rates", "client_rates", "all"]
);
