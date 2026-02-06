const { Account, InstrumentInterestRate, sequelize } = require('./models');

async function verify() {
    try {
        console.log('1. Checking Account types...');
        const ppfAccount = await Account.create({
            name: 'Test PPF',
            type: 'ppf',
            institution: 'SBI',
            UserId: '8c03d96a-7052-4131-85a4-d1adb46cdba8'
        });
        console.log('   Success: Created PPF account with ID', ppfAccount.id);

        console.log('2. Checking InterestRate model...');
        const rate = await InstrumentInterestRate.create({
            instrumentType: 'ppf',
            rate: 7.1,
            effectiveFrom: '2024-04-01',
            UserId: '8c03d96a-7052-4131-85a4-d1adb46cdba8'
        });
        console.log('   Success: Created Interest Rate with ID', rate.id);

        // Cleanup
        await ppfAccount.destroy();
        await rate.destroy();
        console.log('3. Cleanup completed.');

    } catch (err) {
        console.error('Verification failed:', err.message);
    } finally {
        // sequelize.close(); // Don't close if it's shared or if you need more tests
    }
}

verify();
