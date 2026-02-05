const XLSX = require('xlsx');
const path = require('path');

async function check() {
    try {
        const excelPath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');
        const workbook = XLSX.readFile(excelPath);

        for (let i = 0; i < 12 && i < workbook.SheetNames.length; i++) {
            const name = workbook.SheetNames[i];
            const sheet = workbook.Sheets[name];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            let dataRows = 0;
            for (let r = 3; r < data.length; r++) {
                const row = data[r];
                // Check if any account has a date and amount in this row
                let hasData = false;
                for (let c = 0; c < row.length; c += 5) {
                    if (row[c] && (row[c + 3] || row[c + 4])) {
                        hasData = true;
                        break;
                    }
                }
                if (hasData) dataRows++;
            }

            console.log(`${i}: ${name.padEnd(20)} | Total Rows: ${data.length.toString().padStart(5)} | Data Rows: ${dataRows.toString().padStart(5)}`);
        }
    } catch (err) {
        console.error(err);
    }
}

check();
