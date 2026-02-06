const fs = require('fs');

function inspectData() {
    const data = JSON.parse(fs.readFileSync('../pf_data_all.json', 'utf8'));
    const seen = new Map();

    for (const filename in data) {
        const tables = data[filename].data;
        if (!tables) continue;

        tables.forEach((table, tIdx) => {
            let isTx = false;
            table.forEach(row => {
                if (JSON.stringify(row).includes('Wage Month') && JSON.stringify(row).includes('Transaction')) isTx = true;
            });
            if (!isTx) return;

            table.forEach(row => {
                const dateStr = row[1];
                if (dateStr && /^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
                    const total = parseFloat((row[6] || '0').replace(/,/g, '')) + parseFloat((row[7] || '0').replace(/,/g, ''));
                    const key = `${dateStr}|${total.toFixed(2)}`;
                    if (!seen.has(key)) seen.set(key, []);
                    seen.get(key).push(`${filename} [T${tIdx}]`);
                }
            });
        });
    }

    let totalSum = 0;
    for (const [key, files] of seen) {
        const [date, amt] = key.split('|');
        totalSum += parseFloat(amt);
        if (files.length > 1) {
            console.log(`DUPLICATE: ${key} found in: ${files.join(', ')}`);
        }
    }
    console.log(`Unique Sum: ${totalSum}`);
}

inspectData();
