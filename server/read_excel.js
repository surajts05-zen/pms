const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const filePath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');
const outputPath = path.join(__dirname, 'excel_dump.txt');

let output = '';
const log = (...args) => {
    output += args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n';
};

log('Reading file:', filePath);

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = 'FD';

    if (!workbook.Sheets[sheetName]) {
        log(`Sheet "${sheetName}" not found. Available sheets:`, workbook.SheetNames);
    } else {
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        log('--- First 10 Rows ---');
        for (let i = 0; i < 10; i++) {
            log(`Row ${i + 1}:`, rawData[i]);
        }

        log('\n--- Formula Check (Rows 5-10, Cols F-P) ---');
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let R = 4; R <= Math.min(10, range.e.r); ++R) {
            for (let C = 5; C <= Math.min(15, range.e.c); ++C) {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                const cell = worksheet[cell_ref];
                if (cell && cell.f) {
                    log(`Cell ${cell_ref} formula: ${cell.f}`);
                }
            }
        }
    }
} catch (error) {
    log('Error reading file:', error);
}

fs.writeFileSync(outputPath, output);
console.log('Done writing to', outputPath);
