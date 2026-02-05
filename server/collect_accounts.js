const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');
const workbook = XLSX.readFile(excelPath);

const allAccounts = new Set();

for (let i = 0; i < 12; i++) {
    const sheetName = workbook.SheetNames[i];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const row0 = data[0] || [];
    for (let c = 0; c < row0.length; c += 5) {
        if (row0[c] && row0[c].trim()) {
            allAccounts.add(row0[c].trim());
        }
    }
}

console.log('All unique account names found in tabs 1-12:');
console.log(Array.from(allAccounts));
