const fs = require('fs');
let content = fs.readFileSync('frontend/src/pages/Analytics.jsx', 'utf8');

// The template literals we saw:
// value={`? ${...}`} -> value={<span style={{display:'flex',alignItems:'center'}}><RupeeIcon size={24}/> &nbsp;{ ... }</span>}
content = content.replace(/value=\{\`\?\s*\$\{(.*?)\}\`\}/g, "value={<span style={{display:'flex',alignItems:'center'}}><RupeeIcon size={24}/> &nbsp;{$1}</span>}");

// tooltips and formatters:
// `? ${...}` -> `₹ ${...}`
content = content.replace(/\`\?\s*\$\{/g, "\`₹ ${");
// `?${...}` -> `₹${...}`
content = content.replace(/\`\?\$\{/g, "\`₹${");

if (content.includes('RupeeIcon') && !content.includes('import RupeeIcon')) {
  content = "import RupeeIcon from '../components/RupeeIcon';\n" + content;
}

fs.writeFileSync('frontend/src/pages/Analytics.jsx', content, 'utf8');
console.log('Fixed Analytics.jsx');
