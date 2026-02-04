
const transactions = [
    {
        AccountId: '7606f3b0-2289-4546-b601-2f0df5efa60b',
        InstrumentId: '6d6f2620-84ec-4cc7-9d98-813391877ecd',
        type: 'transfer_out',
        transactionDate: '2024-03-04',
        quantity: 1.0,
        price: 2836.4,
        notes: 'Fix V3 - PascalCase Keys'
    },
    {
        AccountId: '7606f3b0-2289-4546-b601-2f0df5efa60b',
        InstrumentId: '6d6f2620-84ec-4cc7-9d98-813391877ecd',
        type: 'transfer_out',
        transactionDate: '2024-06-03',
        quantity: 5.0,
        price: 2865.5,
        notes: 'Fix V3 - PascalCase Keys'
    }
];

async function run() {
    try {
        for (const t of transactions) {
            console.log(`Posting ${t.transactionDate}...`);
            const response = await fetch('http://localhost:5000/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(t)
            });
            const data = await response.json();
            console.log('Status:', response.status);
            console.log('Response:', JSON.stringify(data));
        }
    } catch (e) {
        console.error(e);
    }
}

run();
