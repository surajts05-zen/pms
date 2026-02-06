
// const fetch = require('node-fetch');

async function testDateOrder() {
    const baseUrl = 'http://localhost:5000/api';

    // We need a specific ticker to test isolation
    const ticker = 'TEST_ORDER_' + Date.now();
    let accountId, instrumentId;

    try {
        // 1. Get/Create Account
        const accRes = await fetch(`${baseUrl}/accounts`);
        const accounts = await accRes.json();
        if (accounts.length > 0) accountId = accounts[0].id;
        else return console.error('No accounts found');

        // 2. Create Instrument
        const newInst = await fetch(`${baseUrl}/instruments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test Order Stock', ticker: ticker, type: 'stock', category: 'safe' })
        });
        const inst = await newInst.json();
        instrumentId = inst.id;

        console.log(`Created Instrument: ${ticker}`);

        // 3. Create Transactions
        // Day 1: Buy 100
        await fetch(`${baseUrl}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transactionDate: '2025-05-01',
                type: 'buy',
                quantity: 100,
                price: 10,
                AccountId: accountId,
                InstrumentId: instrumentId
            })
        });

        // Day 2: Buy 50 (Intraday)
        await fetch(`${baseUrl}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transactionDate: '2025-05-05',
                type: 'buy',
                quantity: 50,
                price: 10,
                AccountId: accountId,
                InstrumentId: instrumentId
            })
        });

        // Day 2: Split 2:1 (Doubles holding logic)
        // Correct Logic: Applies to Opening Balance (100).
        // New Holdings = (100 * 2) + 50 = 250.
        // Incorrect Logic (Split last): (100 + 50) * 2 = 300.
        await fetch(`${baseUrl}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transactionDate: '2025-05-05',
                type: 'split',
                quantity: 2, // 2:1
                price: 0,
                AccountId: accountId,
                InstrumentId: instrumentId
            })
        });

        // 4. Check Portfolio
        const pfRes = await fetch(`${baseUrl}/portfolio?accountId=${accountId}`);
        const pf = await pfRes.json();

        const holding = pf.holdings.find(h => h.ticker === ticker);

        if (holding) {
            console.log(`Holding for ${ticker}: ${holding.quantity}`);
            if (holding.quantity === 250) {
                console.log('SUCCESS: Corporate action applied to opening balance.');
            } else {
                console.log('FAILURE: Corporate action application order is incorrect.');
            }
        } else {
            console.log('Holding not found.');
        }

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

testDateOrder();
