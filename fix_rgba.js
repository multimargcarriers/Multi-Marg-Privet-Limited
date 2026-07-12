const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.css') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./frontend/src');

const replacementMap = {
  'rgba(0₹₹₹.1)': 'rgba(0, 0, 0, 0.1)',
  'rgba(0₹₹₹.05)': 'rgba(0, 0, 0, 0.05)',
  'rgba(0₹₹₹.04)': 'rgba(0, 0, 0, 0.04)',
  'rgba(0₹₹₹.03)': 'rgba(0, 0, 0, 0.03)',
  'rgba(0₹₹₹.02)': 'rgba(0, 0, 0, 0.02)',
  'rgba(255₹55₹55₹.1)': 'rgba(255, 255, 255, 0.1)',
  'rgba(255₹55₹55₹.2)': 'rgba(255, 255, 255, 0.2)',
  'rgba(13₹10₹53₹.15)': 'rgba(13, 110, 253, 0.15)',
  'rgba(92₹67₹55₹.15)': 'rgba(92, 167, 155, 0.15)',
  'rgba(13,110,153,1.15)': 'rgba(13, 110, 253, 0.15)',
  'rgba(92,167,155,1.15)': 'rgba(92, 167, 155, 0.15)',
  'rgba(13,110,153,1.15)': 'rgba(13, 110, 253, 0.15)',
  'rgba(92,167,155,1.15)': 'rgba(92, 167, 155, 0.15)'
};

let modifiedFiles = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // Replace invalid encoding chars in Login.jsx just in case
  content = content.replace(/rgba\(13.,110.,153.,1.15\)/g, 'rgba(13, 110, 253, 0.15)');
  content = content.replace(/rgba\(92.,167.,155.,1.15\)/g, 'rgba(92, 167, 155, 0.15)');

  // Fix rgba
  for (const [bad, good] of Object.entries(replacementMap)) {
    content = content.split(bad).join(good);
  }

  // Fix specific known corruptions from BillView2 and others
  content = content.replace(/\?\s*5₹00\.00/g, '<RupeeIcon size={12}/> 5,000.00');
  content = content.replace(/\?\s*5₹50\.00/g, '<RupeeIcon size={12}/> 5,050.00');

  // Replace textual ₹ with <RupeeIcon />
  // We look for ₹ followed by optional spaces and {
  content = content.replace(/₹\s*\{/g, '<RupeeIcon size={14} /> {');
  // Or ₹ followed by spaces and a number
  content = content.replace(/₹\s*(\d)/g, '<RupeeIcon size={14} /> $1');

  // Inject import if RupeeIcon was used and not imported
  if (content !== original && content.includes('<RupeeIcon') && !content.includes('import RupeeIcon')) {
    // find last import or start of file
    const importRegex = /import\s+.*?;?\n/g;
    let match;
    let lastIndex = 0;
    while ((match = importRegex.exec(content)) !== null) {
      lastIndex = importRegex.lastIndex;
    }
    
    // figure out relative path to components folder
    const dir = path.dirname(f);
    let relative = path.relative(dir, path.join(process.cwd(), 'frontend/src/components/RupeeIcon'));
    // convert windows paths to forward slashes
    relative = relative.replace(/\\/g, '/');
    if (!relative.startsWith('.')) relative = './' + relative;
    
    const importStatement = `import RupeeIcon from '${relative}';\n`;
    content = content.slice(0, lastIndex) + importStatement + content.slice(lastIndex);
  }

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log(`Fixed: ${f}`);
    modifiedFiles++;
  }
});

console.log(`Total files modified: ${modifiedFiles}`);
