const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'pages', 'IAM.jsx');
let content = fs.readFileSync(file, 'utf8');

const targetStr = `  {
    id: 'masters',
    name: 'Masters Section',
    pages: [
      { id: 'clients', name: 'Clients' },
      { id: 'branches', name: 'Branches' },
      { id: 'cities', name: 'Cities' },
      { id: 'vendors', name: 'Vendors' }
    ]
  },
  {
    id: 'rates',
    name: 'Rates Section',
    pages: [
      { id: 'client_rates', name: 'Client Rates' }
    ]
  },`;

const replaceStr = `  {
    id: 'masters',
    name: 'Masters Section',
    pages: [
      { id: 'clients', name: 'Clients' },
      { id: 'clients_data', name: 'Clients (Data Access Only)' },
      { id: 'branches', name: 'Branches' },
      { id: 'branches_data', name: 'Branches (Data Access Only)' },
      { id: 'cities', name: 'Cities' },
      { id: 'cities_data', name: 'Cities (Data Access Only)' },
      { id: 'vendors', name: 'Vendors' },
      { id: 'vendors_data', name: 'Vendors (Data Access Only)' }
    ]
  },
  {
    id: 'rates',
    name: 'Rates Section',
    pages: [
      { id: 'client_rates', name: 'Client Rates' },
      { id: 'client_rates_data', name: 'Client Rates (Data Access Only)' }
    ]
  },`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(file, content);
  console.log("IAM.jsx patched successfully!");
} else {
  console.log("Could not find the target string in IAM.jsx.");
}
