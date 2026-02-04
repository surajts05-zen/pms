const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    console.log('Sheet Names:', workbook.SheetNames);

    workbook.SheetNames.slice(0, 15).forEach(sheetName => {
        console.log(`\n--- ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Print first 5 rows
        data.slice(0, 5).forEach((row, i) => {
            console.log(`Row ${i}:`, JSON.stringify(row));
        });
    });
} catch (error) {
    console.error('Error reading excel:', error.message);
}
