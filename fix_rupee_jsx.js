const fs = require('fs');
const path = require('path');

const targetFiles = [
  'frontend/src/pages/AllBills.jsx',
  'frontend/src/pages/BillView1.jsx',
  'frontend/src/pages/BookingsList.jsx',
  'frontend/src/pages/reports/SalesReports.jsx',
  'frontend/src/pages/reports/UnbilledReports.jsx',
  'frontend/src/pages/UpdateBill.jsx',
  'frontend/src/pages/UpdateInvoice.jsx'
];

targetFiles.forEach(f => {
  const filePath = path.resolve(process.cwd(), f);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace > ? { with ><RupeeIcon size={14} /> {
  content = content.replace(/>\s*\?\s*\{/g, '><RupeeIcon size={14} /> {');

  if (content !== original && !content.includes('import RupeeIcon')) {
    // determine relative path for import
    const dir = path.dirname(filePath);
    let relative = path.relative(dir, path.resolve(process.cwd(), 'frontend/src/components/RupeeIcon'));
    relative = relative.replace(/\\/g, '/');
    if (!relative.startsWith('.')) relative = './' + relative;
    const importStatement = `import RupeeIcon from '${relative}';\n`;
    
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfLine = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfLine + 1) + importStatement + content.slice(endOfLine + 1);
    } else {
      content = importStatement + content;
    }
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed ' + f);
  }
});
