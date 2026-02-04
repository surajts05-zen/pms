const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const aprSheet = workbook.Sheets['Apr 2025'];
    const aprData = XLSX.utils.sheet_to_json(aprSheet, { header: 1 });

    console.log('--- Account Headers Mapping ---');
    // Row 0, 1, or 2 might contain account names
    for (let r = 0; r < 5; r++) {
        console.log(`Row ${r}:`);
        aprData[r].forEach((val, c) => {
            if (val) console.log(`  Col ${c}: ${val}`);
        });
    }

} catch (error) {
    console.error('Error:', error.message);
}
