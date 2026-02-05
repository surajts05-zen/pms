const XLSX = require('xlsx');
const path = require('path');

async function test() {
    try {
        const excelPath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');
        const workbook = XLSX.readFile(excelPath);
        const sheet = workbook.Sheets['May 2025'];
        if (!sheet) {
            console.log('Sheet "May 2025" not found.');
            return;
        }
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        console.log('--- Row 0 (Headers/Account Names) ---');
        console.log(JSON.stringify(data[0]));
        console.log('--- Row 2 (Opening Balance) ---');
        console.log(JSON.stringify(data[2]));
        console.log('--- Rows 3-10 (Transactions) ---');
        console.log(JSON.stringify(data.slice(3, 10), null, 2));
    } catch (err) {
        console.error(err);
    }
}

test();
