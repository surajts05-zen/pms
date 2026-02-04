
const fs = require('fs');

async function run() {
    try {
        const transRes = await fetch('http://localhost:5000/api/transactions');
        const transactions = await transRes.json();
        const instrumentsRes = await fetch('http://localhost:5000/api/instruments');
        const instruments = await instrumentsRes.json();
        const accountsRes = await fetch('http://localhost:5000/api/accounts');
        const accounts = await accountsRes.json();

        // Map IDs
        const instMap = {};
        instruments.forEach(i => instMap[i.id] = i.ticker);

        const accMap = {};
        accounts.forEach(a => accMap[a.id] = a.name);

        let output = '--- ASIANPAINT SPECIFIC LOGS ---\n';
        transactions.forEach(t => {
            const ticker = instMap[t.InstrumentId];
            const accName = accMap[t.AccountId];
            if (!ticker || !accName) return;

            if (ticker.includes('ASIANPAINT')) {
                if (accName === 'Conservative' || accName === 'Shloka') {
                    output += `${t.transactionDate} | ${accName} | ${ticker} | ${t.type} | ${t.quantity} | Price: ${t.price}\n`;
                }
            }
        });

        fs.writeFileSync('debug_output.txt', output);
        console.log('Done writing to debug_output.txt');

    } catch (e) {
        console.error(e);
    }
}

run();
