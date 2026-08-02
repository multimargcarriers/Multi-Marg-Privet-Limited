const fs = require('fs');

function processCsv(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lowerContent = content.toLowerCase();
    fs.writeFileSync(filePath, lowerContent);
    console.log('Processed ' + filePath);
}

processCsv('frontend/public/trip (6).csv');
processCsv('frontend/public/lr_details (5).csv');
