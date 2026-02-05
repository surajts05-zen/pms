const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');
const workbook = XLSX.readFile(excelPath);

const sheetAnalysis = [];

for (let i = 0; i < 12; i++) {
    const sheetName = workbook.SheetNames[i];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const row0 = data[0] || [];
    const accounts = [];
    for (let c = 0; c < row0.length; c += 5) {
        if (row0[c] && row0[c].trim()) {
            accounts.push(row0[c].trim());
        }
    }

    sheetAnalysis.push({
        sheetName,
        accounts
    });
}

fs.writeFileSync('all_sheets_accounts.json', JSON.stringify(sheetAnalysis, null, 2));
console.log('Saved account analysis per sheet.');
