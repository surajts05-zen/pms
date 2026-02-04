const API_URL = 'http://localhost:5000/api/fds';

async function testFDs() {
    try {
        console.log('1. Fetching existing FDs...');
        const res1 = await fetch(API_URL);
        const data1 = await res1.json();
        console.log(`   Found ${data1.length} FDs.`);

        console.log('2. Creating a new FD...');
        const newFD = {
            bankName: 'Test Bank',
            accountNumber: '1234567890',
            principalAmount: 100000,
            interestRate: 7.5,
            startDate: '2024-01-01',
            maturityDate: '2025-01-01',
            maturityAmount: 107500,
            autoRenew: false,
            remarks: 'Test FD'
        };
        const res2 = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newFD)
        });
        const data2 = await res2.json();
        console.log('   FD Created:', data2.id);
        const createdId = data2.id;

        console.log('3. Updating the FD...');
        const updateData = { remarks: 'Updated Test FD' };
        const res3 = await fetch(`${API_URL}/${createdId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        const data3 = await res3.json();
        console.log('   FD Updated:', data3.remarks);

        console.log('4. Deleting the FD...');
        const res4 = await fetch(`${API_URL}/${createdId}`, {
            method: 'DELETE'
        });
        const data4 = await res4.json();
        console.log('   FD Deleted:', data4);

        console.log('5. Verifying deletion...');
        const res5 = await fetch(`${API_URL}/${createdId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        if (res5.status === 404) {
            console.log('   Verification Successful: FD not found as expected.');
        } else {
            console.log('   Verification Failed: Unexpected status', res5.status);
        }

    } catch (err) {
        console.error('Test Failed:', err.message);
    }
}

testFDs();
