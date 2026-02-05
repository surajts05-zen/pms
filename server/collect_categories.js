const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets['Apr 2025'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

const categories = new Set();

for (let r = 3; r < data.length; r++) {
    const row = data[r] || [];
    for (let c = 2; c < row.length; c += 5) {
        if (row[c] && row[c].trim()) {
            categories.add(row[c].trim());
        }
    }
}

const list = Array.from(categories).sort();
fs.writeFileSync('excel_categories.json', JSON.stringify(list, null, 2));
console.log('Saved to excel_categories.json');
