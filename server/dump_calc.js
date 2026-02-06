const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');
const outputPath = path.join(__dirname, 'calc_dump.txt');

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = 'Calc';

    if (!workbook.Sheets[sheetName]) {
        console.log(`Sheet "${sheetName}" not found. Available sheets:`, workbook.SheetNames);
    } else {
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        fs.writeFileSync(outputPath, JSON.stringify(rawData, null, 2));
        console.log('Done writing to', outputPath);
    }
} catch (error) {
    console.error('Error reading file:', error);
}
