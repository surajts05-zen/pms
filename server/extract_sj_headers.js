const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sjSheet = workbook.Sheets['Stock Journal'];
    const sjData = XLSX.utils.sheet_to_json(sjSheet, { header: 1 });

    console.log('--- Stock Journal Headers Mapping ---');
    for (let r = 0; r < 5; r++) {
        console.log(`Row ${r}:`);
        if (sjData[r]) {
            sjData[r].forEach((val, c) => {
                if (val) console.log(`  Col ${c}: ${val}`);
            });
        }
    }

} catch (error) {
    console.error('Error:', error.message);
}
