const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    if (fs.statSync(file).isDirectory() && !file.includes('node_modules') && !file.includes('dist')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./frontend/src');
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let original = content;

  // We want to wrap the <RupeeIcon> and the {text} inside a single inline-flex container that doesn't wrap
  // Basically replacing:
  // <td><RupeeIcon size={14} /> {parseFloat(...)}</td>
  // With:
  // <td><span style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}><RupeeIcon size={14} />&nbsp;{parseFloat(...)}</span></td>

  const regex = /(<td[^>]*>)<RupeeIcon size=\{14\} \/> \{(.*?)\}<\/td>/g;
  content = content.replace(regex, '$1<span style={{ display: "inline-flex", alignItems: "center", whiteSpace: "nowrap" }}><RupeeIcon size={14} />&nbsp;{$2}</span></td>');

  if (content !== original) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed ' + f);
  }
});
