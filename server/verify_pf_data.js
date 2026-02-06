const { Transaction, CashflowTransaction, Account, sequelize } = require('./models');

async function verifyPF() {
    const UserId = 'a18b80a4-9e20-46cd-854e-708ab2c11ed7';
    try {
        await sequelize.authenticate();
        const account = await Account.findOne({ where: { type: 'pf', UserId } });
        if (!account) throw new Error('PF Account not found');

        const transactions = await Transaction.findAll({
            where: { AccountId: account.id },
            order: [['transactionDate', 'ASC']]
        });

        console.log(`Total transactions: ${transactions.length}`);

        const yearlyCounts = {};
        const yearlySums = {};
        transactions.forEach(t => {
            const y = t.transactionDate.substring(0, 4);
            yearlyCounts[y] = (yearlyCounts[y] || 0) + 1;
            yearlySums[y] = (yearlySums[y] || 0) + parseFloat(t.quantity);
        });

        console.log('Yearly transaction counts:');
        console.log(JSON.stringify(yearlyCounts, null, 2));
        console.log('Yearly transaction sums:');
        console.log(JSON.stringify(yearlySums, null, 2));

        console.log(`Current Account Balance: ${account.balance}`);

    } catch (error) {
        console.error('Verification failed:', error);
    } finally {
        await sequelize.close();
    }
}

verifyPF();
