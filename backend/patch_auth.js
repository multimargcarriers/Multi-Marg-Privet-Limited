const fs = require('fs');
const file = 'src/controllers/authController.js';
let content = fs.readFileSync(file, 'utf8');

// The exact string to replace
const targetStr = "role !== 'admin' && role !== 'superadmin' && role !== 'vendor'";
const replaceStr = "role !== 'admin' && role !== 'superadmin' && role !== 'vendor' && role !== 'employee'";

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  console.log("Replaced role string.");
} else {
  console.log("Could not find role string.");
}

const targetStr2 = "Admins, Super Admins, and Vendors allowed";
const replaceStr2 = "Admins, Super Admins, Vendors, and Employees allowed";

if (content.includes(targetStr2)) {
  content = content.replace(targetStr2, replaceStr2);
  console.log("Replaced comment string.");
} else {
  console.log("Could not find comment string.");
}

fs.writeFileSync(file, content);
console.log("Done.");
