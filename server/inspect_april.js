const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');
const workbook = XLSX.readFile(excelPath);
const sheet = workbook.Sheets['Apr 2025'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log('--- Apr 2025 Sheet Structure ---');
for (let r = 0; r < 25; r++) {
    const row = data[r] || [];
    let line = `Row ${r.toString().padStart(2)}: `;
    for (let c = 0; c < 15; c++) {
        const cell = (row[c] || '').toString().substring(0, 15);
        line += `| ${cell.padEnd(15)} `;
    }
    console.log(line);
}
