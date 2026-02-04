
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

        let output = '--- SPLIT & BONUS TRANSACTIONS ---\n';
        transactions.forEach(t => {
            if (t.type === 'split' || t.type === 'bonus') {
                const ticker = instMap[t.InstrumentId];
                const accName = accMap[t.AccountId];
                output += `Date: ${t.transactionDate} | Account: ${accName} | Ticker: ${ticker} | Type: ${t.type} | Qty: ${t.quantity} | Price: ${t.price}\n`;
            }
        });

        fs.writeFileSync('splits_output.txt', output);
        console.log('Written to splits_output.txt');

    } catch (e) {
        console.error(e);
    }
}
run();
