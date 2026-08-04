const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src', 'controllers');

fs.readdirSync(controllersDir).forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(controllersDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace the specific corrupted block
    if (content.includes('expiresAt: new Date(Date.now(),') && content.includes('deletedBy: req.user ? { id: req.user.id, name: req.user.name, role: req.user.role } : null + 30 * 24 * 60 * 60 * 1000)')) {
      const fixedContent = content.replace(
        /expiresAt: new Date\(Date\.now\(\),\s*deletedBy: req\.user \? \{ id: req\.user\.id, name: req\.user\.name, role: req\.user\.role \} : null \+ 30 \* 24 \* 60 \* 60 \* 1000\)/g,
        'expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),\n        deletedBy: req.user ? { id: req.user.id, name: req.user.name, role: req.user.role } : null'
      );
      fs.writeFileSync(filePath, fixedContent);
      console.log(`Fixed syntax in ${file}`);
    }
  }
});
