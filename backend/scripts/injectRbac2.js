const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, '..', 'src', 'routes');

const map = {
  'dashboard.js': ['dashboard'],
  'outstanding.js': ['accounts', 'outstanding'],
  'vendor-outstanding.js': ['accounts', 'vendor_outstanding'],
  'email.js': ['reports', 'billing', 'email_reports']
};

for (const [file, perms] of Object.entries(map)) {
  const filePath = path.join(routesPath, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('requirePermission')) {
      console.log(`Skipping ${file}`);
      continue;
    }
    
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
