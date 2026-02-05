const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets['Apr 2025'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

let output = '';
output += '--- Header Rows ---\n';
for (let r = 0; r < 5; r++) {
    output += `Row ${r}: ` + JSON.stringify(data[r]) + '\n';
}

output += '\n--- Data Row (Row 9) ---\n';
output += `Row 9: ` + JSON.stringify(data[9]) + '\n';

fs.writeFileSync('header_research.txt', output);
console.log('Result written to header_research.txt');
