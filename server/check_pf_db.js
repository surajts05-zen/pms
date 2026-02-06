const { Transaction, Account, sequelize } = require('./models');

async function check() {
    const UserId = 'a18b80a4-9e20-46cd-854e-708ab2c11ed7';
    try {
        await sequelize.authenticate();
        const account = await Account.findOne({ where: { type: 'pf', UserId } });
        const ts = await Transaction.findAll({ where: { AccountId: account.id } });

        console.log(`Total count: ${ts.length}`);
        let totalSum = 0;
        const yearly = {};
        ts.forEach(t => {
            const y = t.transactionDate.substring(0, 4);
            const amt = parseFloat(t.quantity);
            yearly[y] = (yearly[y] || 0) + amt;
            totalSum += amt;
        });

        console.log('Yearly Sums:', yearly);
        console.log('Total Sum:', totalSum);
        console.log('Account Balance:', account.balance);
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
check();
