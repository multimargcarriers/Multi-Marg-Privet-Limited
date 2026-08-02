const fs = require('fs');
const file = 'frontend/src/pages/Trips.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

// 1. Add imports
const importIdx = lines.findIndex(l => l.includes('import { useToast }'));
lines.splice(importIdx + 1, 0, 'import TripMIS from "../components/trips/TripMIS";', 'import VendorMIS from "../components/trips/VendorMIS";');

// 2. Remove states (lines 36-83 approx)
const startState = lines.findIndex(l => l.includes('// Trip List Frontend-Only State'));
const endState = lines.findIndex(l => l.includes('const handleCreateNew = async'));
if(startState !== -1 && endState !== -1) {
    lines.splice(startState, endState - startState);
}

// 3. Remove List view
const startList = lines.findIndex(l => l.includes('{view === "list" && ('));
const endList = lines.findIndex(l => l.includes('{view === "bill" && ('));
if(startList !== -1 && endList !== -1) {
    lines.splice(startList, endList - startList, '      {view === "list" && <TripMIS />}', '');
}

// 4. Remove Sheet view
const startSheet = lines.findIndex(l => l.includes('{view === "sheet" && ('));
const endSheet = lines.findIndex(l => l.includes('{paymentModal.isOpen && ('));
if(startSheet !== -1 && endSheet !== -1) {
    lines.splice(startSheet, endSheet - startSheet, '      {view === "sheet" && <VendorMIS />}', '');
}

// 5. Remove payment modal
const startModal = lines.findIndex(l => l.includes('{paymentModal.isOpen && ('));
const endModal = lines.findIndex(l => l.includes('export default Trips;'));
if(startModal !== -1 && endModal !== -1) {
    lines.splice(startModal, endModal - startModal - 2); 
}

fs.writeFileSync(file, lines.join('\n'));
