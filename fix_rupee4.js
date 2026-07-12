const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.jsx') || file.endsWith('.js')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'frontend/src'));
let count = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Revert any \u20B9 from my first broken script just in case they are still lingering
  content = content.replace(/\\u20B9/g, '₹');
  content = content.replace(/&#8377;/g, '₹');
  
  // Fix the ANSI corruption
  content = content.replace(/â‚¹/g, '₹');
  
  // Sometimes PowerShell/Node reads it as  if it's invalid UTF-8
  content = content.replace(/,1/g, '₹');
  content = content.replace(//g, '₹'); // Careful with this if there are other emojis

  if (content !== original) {
    // Save explicitly as UTF-8
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log('Fixed:', file);
  }
});

console.log('Total files fixed:', count);
