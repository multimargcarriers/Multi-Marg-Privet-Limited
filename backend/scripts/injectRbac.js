const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, '..', 'src', 'routes');

const map = {
  'clients.js': ['masters', 'clients'],
  'branches.js': ['masters', 'branches'],
  'cities.js': ['masters', 'cities'],
  'vendors.js': ['masters', 'vendors'],
  'rates.js': ['rates', 'client_rates'],
  'bills.js': ['billing', 'all_bills', 'generate_bills', 'misc_bill', 'update_bill'],
  'cash.js': ['accounts', 'cash_sheet'],
  'purchases.js': ['accounts', 'purchases'],
  'reports.js': ['reports'],
  'mis.js': ['reports', 'mis_reports'],
  'analytics.js': ['reports', 'analytics'],
  'sales.js': ['reports', 'sales_reports'],
  'purchase-report.js': ['reports', 'purchase_reports'],
  'unbilled.js': ['reports', 'unbilled_reports'],
  'exports.js': ['reports'],
  'print.js': ['billing', 'reports'], // Printing spans both
  'box.js': ['uploads', 'upload_box'],
  'vouchers.js': ['uploads', 'upload_vouchers']
};

for (const [file, perms] of Object.entries(map)) {
  const filePath = path.join(routesPath, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already injected
    if (content.includes('requirePermission')) {
      console.log(`Skipping ${file}`);
      continue;
    }
    
    // Find where to inject: after last require
    const lines = content.split('\n');
    let lastRequireIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('require(')) lastRequireIndex = i;
    }
    
    const injection = `\nconst { requirePermission } = require("../middleware/rbac");\nrouter.use(requirePermission(${JSON.stringify(perms)}));\n`;
    
    lines.splice(lastRequireIndex + 1, 0, injection);
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`Updated ${file}`);
  }
}
