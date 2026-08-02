const fs = require('fs');
const file = 'frontend/src/pages/Trips.jsx';
let lines = fs.readFileSync(file, 'utf8').split('\n');

const startDupe = lines.findIndex((l, i) => i > 380 && l.includes('<div className="grid-2-col">'));
const endDupe = lines.findIndex((l, i) => i > 380 && l.includes('{view === "list" && <TripMIS />}'));

if (startDupe !== -1 && endDupe !== -1) {
    lines.splice(startDupe, endDupe - startDupe);
    fs.writeFileSync(file, lines.join('\n'));
} else {
    console.log("Could not find boundaries");
}
