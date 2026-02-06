const fs = require('fs');

function checkHeaders() {
    const data = JSON.parse(fs.readFileSync('../pf_data_all.json', 'utf8'));
    for (const filename in data) {
        console.log(`--- ${filename} ---`);
        const tables = data[filename].data || [];
        tables.forEach((table, tIdx) => {
            table.forEach((row, rIdx) => {
                const rowStr = JSON.stringify(row);
                if (rowStr.includes('Wage Month')) {
                    console.log(`  Table ${tIdx} Row ${rIdx}:`, row);
                }
            });
        });
    }
}
checkHeaders();
