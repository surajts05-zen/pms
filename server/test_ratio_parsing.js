
// const fetch = require('node-fetch');

async function testRatioParsing() {
    const baseUrl = 'http://localhost:5000/api';

    // Create a dummy account and instrument first (or fetch existing)
    // For simplicity, we'll try to fetch existing ones, if not create.
    let accountId, instrumentId;

    try {
        const accRes = await fetch(`${baseUrl}/accounts`);
        const accounts = await accRes.json();
        if (accounts.length > 0) accountId = accounts[0].id;
        else {
            // Create account
            const newAcc = await fetch(`${baseUrl}/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Test Account', type: 'demat' })
            });
            const acc = await newAcc.json();
            accountId = acc.id;
        }

        const instRes = await fetch(`${baseUrl}/instruments`);
        const instruments = await instRes.json();
        if (instruments.length > 0) instrumentId = instruments[0].id; // Use first instrument
        else {
            // Create instrument
            const newInst = await fetch(`${baseUrl}/instruments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Test Stock', ticker: 'TEST', type: 'stock', category: 'safe' })
            });
            const inst = await newInst.json();
            instrumentId = inst.id;
        }


        // Test Case 1: Bonus 1:2 (1 new for 2 old) -> expects 0.5
        const bonusPayload = {
            transactionDate: '2025-06-01',
            type: 'bonus',
            quantity: '1:2',
            price: 0,
            AccountId: accountId,
            InstrumentId: instrumentId
        };

        const res1 = await fetch(`${baseUrl}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bonusPayload)
        });
        const txn1 = await res1.json();
        console.log(`Test 1 (Bonus 1:2): Quantity=${txn1.quantity} (Expected 0.5)`);

        // Test Case 2: Split 10:1 (1 becomes 10) -> expects 10
        const splitPayload = {
            transactionDate: '2025-06-02',
            type: 'split',
            quantity: '10:1',
            price: 0,
            AccountId: accountId,
            InstrumentId: instrumentId
        };

        const res2 = await fetch(`${baseUrl}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(splitPayload)
        });
        const txn2 = await res2.json();
        console.log(`Test 2 (Split 10:1): Quantity=${txn2.quantity} (Expected 10)`);

    } catch (e) {
        console.error('Test Failed:', e);
    }
}

testRatioParsing();
