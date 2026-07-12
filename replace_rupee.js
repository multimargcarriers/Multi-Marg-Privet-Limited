const fs = require('fs');

const frontendFiles = ['frontend/src/pages/CashSheet.jsx', 'frontend/src/pages/Dashboard.jsx', 'public-frontend/src/pages/GetQuote.jsx'];
frontendFiles.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  const original = content;

  content = content.replace(/,\s*IndianRupee/g, '');
  content = content.replace(/IndianRupee,\s*/g, '');
  content = content.replace(/<IndianRupee/g, '<RupeeIcon');

  if (!content.includes('import RupeeIcon')) {
    const importStatement = "import RupeeIcon from '../components/RupeeIcon';\n";
    
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLine = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLine + 1) + importStatement + content.slice(endOfLine + 1);
    } else {
      content = importStatement + content;
    }
  }

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed ' + f);
  }
});

const backendFiles = ['backend/src/routes/analytics.js', 'backend/src/routes/bills.js', 'backend/src/routes/print.js'];
backendFiles.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('₹')) {
    content = content.replace(/₹/g, 'Rs.');
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed ' + f);
  }
});
