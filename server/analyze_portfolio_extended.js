const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Portfolio-New fetch code'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log('--- Portfolio-New fetch code Rows 50-150 ---');
    data.slice(50, 150).forEach((row, i) => {
        if (row && row.length > 0) {
            console.log(`Row ${i + 50}:`, JSON.stringify(row));
        }
    });
} catch (error) {
    console.error('Error reading excel:', error.message);
}
