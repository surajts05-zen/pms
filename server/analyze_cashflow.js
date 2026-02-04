const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');

try {
    const workbook = XLSX.readFile(filePath);

    console.log('Sheet Names:', workbook.SheetNames);

    // Analyze monthly sheets (assuming they follow a pattern)
    const monthSheets = workbook.SheetNames.filter(name =>
        name.includes('2025') || name.includes('2026')
    );

    if (monthSheets.length > 0) {
        const firstMonthSheet = workbook.Sheets[monthSheets[0]];
        const data = XLSX.utils.sheet_to_json(firstMonthSheet, { header: 1, defval: '' });

        console.log(`\n=== ${monthSheets[0]} Structure ===`);
        console.log('First 20 rows:');
        data.slice(0, 20).forEach((row, i) => {
            console.log(`Row ${i}:`, row);
        });
    }

    // Check for a "List" or master account sheet
    const listSheet = workbook.Sheets['List'];
    if (listSheet) {
        const listData = XLSX.utils.sheet_to_json(listSheet, { header: 1 });
        console.log('\n=== List Sheet ===');
        listData.slice(0, 10).forEach((row, i) => {
            console.log(`Row ${i}:`, row);
        });
    }

} catch (error) {
    console.error('Error reading excel:', error.message);
}
