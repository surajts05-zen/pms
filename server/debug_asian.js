
const fs = require('fs');

async function run() {
    try {
        const transRes = await fetch('http://localhost:5000/api/transactions');
        const transactions = await transRes.json();
        const instrumentsRes = await fetch('http://localhost:5000/api/instruments');
        const instruments = await instrumentsRes.json();
        const accountsRes = await fetch('http://localhost:5000/api/accounts');
        const accounts = await accountsRes.json();

        const instMap = {};
        instruments.forEach(i => instMap[i.id] = i.ticker);
        const accMap = {};
        accounts.forEach(a => accMap[a.id] = a.name);

        let output = '--- ASIANPAINT LOGS ---\n';
        transactions.forEach(t => {
            const ticker = instMap[t.InstrumentId];
            const accName = accMap[t.AccountId];
            if (ticker && ticker.includes('ASIANPAINT') && accName === 'Conservative') {
                output += `${t.transactionDate} | ${t.type} | Qty: ${t.quantity} | Price: ${t.price}\n`;
            }
        });

        fs.writeFileSync('debug_asian_out.txt', output);
        console.log('Done.');

    } catch (e) {
        console.error(e);
    }
}

run();
