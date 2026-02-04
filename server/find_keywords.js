const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Portfolio-New fetch code'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    data.forEach((row, i) => {
        if (row && row.some(cell => cell && typeof cell === 'string' && (cell.toUpperCase().includes('CONSERVATIVE') || cell.toUpperCase().includes('ASPIRATION')))) {
            console.log(`Match at Row ${i}:`, JSON.stringify(row));
        }
    });

} catch (error) {
    console.error('Error reading excel:', error.message);
}
