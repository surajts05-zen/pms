const { Account, Transaction, sequelize } = require('./models');

async function check() {
    try {
        await sequelize.authenticate();
        const pfAccounts = await Account.findAll({ where: { type: 'pf' } });
        console.log(`Found ${pfAccounts.length} PF Accounts`);

        for (const acc of pfAccounts) {
            const txCount = await Transaction.count({ where: { AccountId: acc.id } });
            const minDate = await Transaction.min('transactionDate', { where: { AccountId: acc.id } });
            const maxDate = await Transaction.max('transactionDate', { where: { AccountId: acc.id } });

            console.log(`Account: ${acc.name} (ID: ${acc.id})`);
            console.log(`Transactions: ${txCount}`);
            console.log(`Date Range: ${minDate} to ${maxDate}`);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
check();
