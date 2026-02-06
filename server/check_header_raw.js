const fs = require('fs');

function check() {
    const data = JSON.parse(fs.readFileSync('../pf_data_all.json', 'utf8'));
    for (const filename in data) {
        console.log(`--- ${filename} ---`);
        const tables = data[filename].data || [];
        for (const table of tables) {
            for (const row of table) {
                if (JSON.stringify(row).includes('Wage Month')) {
                    console.log('HEADER ROW:', JSON.stringify(row));
                }
            }
        }
    }
}
check();
