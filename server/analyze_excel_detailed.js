const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');

try {
    const workbook = XLSX.readFile(filePath);

    // Analyze 'Stock Journal'
    const sjSheet = workbook.Sheets['Stock Journal'];
    const sjData = XLSX.utils.sheet_to_json(sjSheet, { header: 1 });
    console.log('--- Stock Journal Columns ---');
    sjData.slice(0, 3).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
    });

    // Analyze 'Apr 2025' monthly sheet
    const aprSheet = workbook.Sheets['Apr 2025'];
    const aprData = XLSX.utils.sheet_to_json(aprSheet, { header: 1 });
    console.log('\n--- Apr 2025 Columns ---');
    aprData.slice(0, 3).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
    });

    // Check 'Dividend' sheet
    const divSheet = workbook.Sheets['Dividend'];
    if (divSheet) {
        const divData = XLSX.utils.sheet_to_json(divSheet, { header: 1 });
        console.log('\n--- Dividend Columns ---');
        divData.slice(0, 3).forEach((row, i) => {
            console.log(`Row ${i}:`, JSON.stringify(row));
        });
    }

} catch (error) {
    console.error('Error reading excel:', error.message);
}
