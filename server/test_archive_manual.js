const API_URL = 'http://localhost:5000/api';

async function testArchiving() {
    try {
        console.log('1. Creating Test Account...');
        const accRes = await fetch(`${API_URL}/accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Archive Account',
                type: 'bank',
                institution: 'Test Bank',
                balance: 0
            })
        });
        const accData = await accRes.json();
        const accountId = accData.id;
        console.log('   Account Created:', accountId);

        console.log('2. Adding Transaction...');
        const instRes = await fetch(`${API_URL}/instruments`);
        const instData = await instRes.json();

        await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                AccountId: accountId,
                type: 'deposit',
                quantity: 1,
                price: 100,
                transactionDate: '2023-01-01',
                InstrumentId: instData[0].id
            })
        });
        console.log('   Transaction Added.');

        console.log('3. Attempting Delete (Expect Failure)...');
        const delRes = await fetch(`${API_URL}/accounts/${accountId}`, { method: 'DELETE' });

        if (delRes.status === 409) {
            const delData = await delRes.json();
            console.log('   SUCCESS: Delete blocked with 409:', delData);
        } else {
            console.error('   FAILED: Unexpected status:', delRes.status);
            return;
        }

        console.log('4. Archiving Account...');
        await fetch(`${API_URL}/accounts/${accountId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isArchived: true })
        });
        console.log('   Account Archived.');

        console.log('5. Verifying Archive Status...');
        const getRes = await fetch(`${API_URL}/accounts`);
        const getData = await getRes.json();
        const account = getData.find(a => a.id === accountId);
        if (account && account.isArchived) {
            console.log('   SUCCESS: Account is marked as archived.');
        } else {
            console.error('   FAILED: Account not found or not archived.');
            return;
        }

    } catch (err) {
        console.error('Test Failed:', err.message);
    }
}

testArchiving();
