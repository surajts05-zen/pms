const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');
const workbook = XLSX.readFile(excelPath);
console.log('Sheet Names:');
workbook.SheetNames.forEach((name, idx) => {
    console.log(`${idx + 1}: ${name}`);
});
