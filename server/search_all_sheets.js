const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        data.forEach((row, i) => {
            if (row && row.some(cell => cell && typeof cell === 'string' && cell.toUpperCase().includes('CONSERVATIVE'))) {
                console.log(`Match in [${sheetName}] Row ${i}:`, JSON.stringify(row));
            }
        });
    });
} catch (error) {
    console.error('Error reading excel:', error.message);
}
