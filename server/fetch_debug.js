
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

        const targetTickers = ['ASIANPAINT.NS', 'ASIANPAINT', 'COFORGE.NS', 'PARAS.NS'];

        const logs = [];

        transactions.forEach(t => {
            const ticker = instMap[t.InstrumentId];
            const accName = accMap[t.AccountId];
            const qty = parseFloat(t.quantity);
            const price = parseFloat(t.price);
            const type = t.type;
            const date = t.transactionDate;

            if (targetTickers.some(tt => ticker && ticker.includes(tt.split('.')[0]))) { // Loose match
                logs.push({
                    account: accName,
                    ticker: ticker,
                    date: date,
                    type: type,
                    qty: qty,
                    price: price,
                    amount: qty * price
                });
            }
        });

        // Sort by dates
        logs.sort((a, b) => new Date(a.date) - new Date(b.date));

        console.log('--- DETAILED LOGS ---');
        console.table(logs);

    } catch (e) {
        console.error(e);
    }
}

run();
