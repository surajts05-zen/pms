const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');
const workbook = XLSX.readFile(excelPath);

const sheet1 = workbook.Sheets['Apr 2025'];
const data = XLSX.utils.sheet_to_json(sheet1, { header: 1, defval: '' });

console.log('--- Account Headers Research (Apr 2025) ---');
// Look at the first 5 rows to find account names
for (let r = 0; r < 5; r++) {
    const row = data[r] || [];
    const nonEntries = row.filter(cell => cell !== '');
    if (nonEntries.length > 0) {
        console.log(`Row ${r}:`, nonEntries);
    }
}

// Check if different columns correspond to different accounts
// Let's look at the full row 2 (often headers)
console.log('\nRow 1 Full:', data[1]);
console.log('\nRow 2 Full:', data[2]);
