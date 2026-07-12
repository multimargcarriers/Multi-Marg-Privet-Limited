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

  // Replace literal characters that might exist
  content = content.replace(/â‚¹/g, '₹');
  content = content.replace(/\\\\u20B9/g, '₹'); // Replace the literal \u20B9 from the broken regex!
  
  // Now replace all ₹ with the exact correct representation
  
  // 1. Inside template literals: `₹ ${val}` -> `\u20B9 ${val}`
  // We match backticks and replace inside them. Since regex can be tricky, 
  // let's do a simple replace for all ₹, then fix it for Recharts/Strings if needed.
  // Actually, &#8377; works PERFECTLY in JSX, and \u20B9 works PERFECTLY in strings.
  
  // Instead of complex regex, let's just replace all '₹ ' with '&#8377; ' globally.
  // Wait, no. Let's just use the literal character `₹`!
  // If the file is saved as UTF-8, `₹` works perfectly everywhere!
  // The only reason it showed `â‚¹` was because the user saved it wrong. 
  // Since this script writes in utf8, the file will be saved in pure UTF-8!
  
  // So all we need to do is replace any broken symbols with `₹` and save as utf8!
  // This is the cleanest solution.

  content = content.replace(/&#8377;/g, '₹');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log('Fixed:', file);
  }
});

console.log('Total files fixed:', count);
