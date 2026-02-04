const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets['Stock Journal'];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log('--- Stock Journal Columns A-H, J-Q, S-AA Analysis ---');
    // Header Row (usually Row 2, index 2)
    const headers = data[2];
    console.log('Headers (Row 2):', JSON.stringify(headers));

    // Sample Data Rows
    for (let i = 3; i < 20; i++) {
        const row = data[i];
        if (!row) continue;

        const sharekhan = row.slice(0, 8);
        const zerodha = row.slice(9, 17);
        const shloka = row.slice(18, 27);

        console.log(`Row ${i} - Sharekhan (A-H):`, JSON.stringify(sharekhan));
        console.log(`Row ${i} - Zerodha (J-Q):`, JSON.stringify(zerodha));
        console.log(`Row ${i} - Shloka (S-AA):`, JSON.stringify(shloka));
        console.log('---');
    }
} catch (error) {
    console.error('Error:', error.message);
}
