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
  if (content.includes('₹') || content.includes('???????')) {
    content = content.replace(/₹/g, '?');
    content = content.replace(/\?\?\?\?\?\?\?/g, '?'); // Just in case it was literally saved as ???????
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log('Fixed:', file);
  }
});

console.log('Total files fixed:', count);
