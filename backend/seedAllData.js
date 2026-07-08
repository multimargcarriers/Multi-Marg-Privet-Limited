const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

function parseCSV(content) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        
        if (inQuotes) {
            if (char === '"') {
                if (content[i + 1] === '"') {
                    currentCell += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if (char === '\n' || char === '\r') {
                if (char === '\r' && content[i + 1] === '\n') {
                    i++;
                }
                currentRow.push(currentCell.trim());
                if (currentRow.some(c => c !== '')) rows.push(currentRow);
                currentRow = [];
                currentCell = '';
            } else {
                currentCell += char;
            }
        }
    }
    if (currentRow.length > 0 || currentCell) {
        currentRow.push(currentCell.trim());
        if(currentRow.some(c => c !== '')) rows.push(currentRow);
    }
    return rows;
}

function readCSV(filename) {
    const filepath = path.join(__dirname, '../frontend/public', filename);
    if (!fs.existsSync(filepath)) return [];
    const content = fs.readFileSync(filepath, 'utf8');
    const rows = parseCSV(content);
    if (rows.length > 0) rows.shift(); // remove headers
    return rows;
}

const misRows = readCSV('mis data.csv');
const unbilledRows = readCSV('unbilled_report.csv');
const tripRows = readCSV('client_trip_report.csv');
const gstRows = readCSV('gst_report (1).csv');

// Collections
const cities = new Set();
const clients = new Set();
const vendors = new Set();
const bookings = [];

// 1. Process MIS Data
// Headers: AWB No(0), Date(1), Consignor(2), Consignee(3), Origin(4), Destination(5), Mode(6), Invoice(s)(7), Invoice Date(s)(8), Part Number(s)(9), Box(10), Quantity(11), Chargeable Weight(12), Status(13)
misRows.forEach((r, idx) => {
    if (r.length < 5) return;
    if (r[4]) cities.add(r[4].toUpperCase());
    if (r[5]) cities.add(r[5].toUpperCase());
    if (r[2]) clients.add(r[2].toUpperCase());
    if (r[3]) clients.add(r[3].toUpperCase());
    
    bookings.push({
        id: `bk_mis_${idx}`,
        lrNo: r[0],
        date: r[1],
        consignor: r[2],
        consignee: r[3],
        origin: r[4],
        destination: r[5],
        mode: r[6],
        invoiceNo: r[7] || '',
        partNo: r[9] || '',
        box: r[10] || '0',
        weight: r[12] || '0',
        status: r[13] || 'Delivered',
        createdAt: new Date().toISOString()
    });
});

// 2. Process Unbilled Data
// Headers: AWB No(0), Date(1), Consignor(2), Consignee(3), Origin(4), Destination(5), Mode(6), Box(7), Chargeable Weight(8), Billed To(9), Remarks(10)
unbilledRows.forEach((r, idx) => {
    if (r.length < 5) return;
    if (r[4]) cities.add(r[4].toUpperCase());
    if (r[5]) cities.add(r[5].toUpperCase());
    if (r[2]) clients.add(r[2].toUpperCase());
    if (r[3]) clients.add(r[3].toUpperCase());
    if (r[9]) clients.add(r[9].toUpperCase());
    
    bookings.push({
        id: `bk_unbilled_${idx}`,
        lrNo: r[0],
        date: r[1],
        consignor: r[2],
        consignee: r[3],
        origin: r[4],
        destination: r[5],
        mode: r[6],
        box: r[7] || '0',
        weight: r[8] || '0',
        billedTo: r[9] || '',
        status: 'Unbilled',
        createdAt: new Date().toISOString()
    });
});

// 3. Process Trip Data
// Headers: Trip No(0), Date(1), Vehicle Type(2), Vehicle No(3), Vendor(4), Origin(5), Destination(6), Client(7), Description(8), Box(9), Chargeable Weight(10), Total Amount(11)
tripRows.forEach(r => {
    if (r.length < 5) return;
    if (r[4]) vendors.add(r[4].toUpperCase());
    if (r[7]) clients.add(r[7].toUpperCase());
    if (r[5]) cities.add(r[5].toUpperCase());
    if (r[6]) cities.add(r[6].toUpperCase());
});

// 4. Process GST Data (to extract Clients and Vendors if any, mostly clients from Bills)
// The GST report was already parsed into seedBills, but let's extract Client from it (idx 3 usually in GST)
gstRows.forEach(r => {
    if (r.length > 5 && r[3]) {
        clients.add(r[3].toUpperCase());
    }
});

// We also have existing Seed Data. Let's merge vendors from previous purchase seeds.
try {
    const existingSeed = require('./src/config/seedData.js');
    if (existingSeed.seedVendors) {
        existingSeed.seedVendors.forEach(v => vendors.add(v.name.toUpperCase()));
    }
    if (existingSeed.seedClients) {
        existingSeed.seedClients.forEach(c => clients.add(c.name.toUpperCase()));
    }
} catch(e) {}

const seedCities = Array.from(cities).filter(c => c && c.length > 2).map((c, i) => ({
    id: `city_${i}`,
    name: c,
    state: "N/A",
    status: "Active"
}));

const seedClientsObj = Array.from(clients).filter(c => c && c.length > 2).map((c, i) => ({
    id: `client_ext_${i}`,
    name: c,
    contact: "N/A",
    phone: "N/A",
    city: "N/A",
    address: "N/A",
    gst: "",
    status: "Active",
    createdAt: new Date().toISOString()
}));

const seedVendorsObj = Array.from(vendors).filter(v => v && v.length > 2).map((v, i) => ({
    id: `vendor_ext_${i}`,
    name: v,
    contact: "N/A",
    phone: "N/A",
    city: "N/A",
    address: "N/A",
    gst: "",
    status: "Active",
    createdAt: new Date().toISOString()
}));

// Build final export string
let fileContent = `// Auto-generated seed data from CSV files\n\n`;
fileContent += `const seedCities = ${JSON.stringify(seedCities, null, 2)};\n\n`;
fileContent += `const seedClients = ${JSON.stringify(seedClientsObj, null, 2)};\n\n`;
fileContent += `const seedVendors = ${JSON.stringify(seedVendorsObj, null, 2)};\n\n`;
fileContent += `const seedBookings = ${JSON.stringify(bookings, null, 2)};\n\n`;

fileContent += `module.exports = { seedCities, seedClients, seedVendors, seedBookings };\n`;

fs.writeFileSync(path.join(__dirname, 'src/config/seedMaster.js'), fileContent, 'utf8');
console.log(`Successfully extracted: ${seedCities.length} Cities, ${seedClientsObj.length} Clients, ${seedVendorsObj.length} Vendors, ${bookings.length} Bookings.`);
