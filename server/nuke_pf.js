const { Transaction, CashflowTransaction, Account, sequelize } = require('./models');

async function clean() {
    try {
        await sequelize.authenticate();
        const account = await Account.findOne({ where: { type: 'pf' } });
        if (account) {
            await sequelize.query('DELETE FROM "Transactions" WHERE "AccountId" = :aid', { replacements: { aid: account.id } });
            await sequelize.query('DELETE FROM "CashflowTransactions" WHERE "AccountId" = :aid', { replacements: { aid: account.id } });
            account.balance = 0;
            await account.save();
            console.log('Cleaned account:', account.id);
        }
        const tCount = await Transaction.count({ where: { AccountId: account ? account.id : null } });
        const cCount = await CashflowTransaction.count({ where: { AccountId: account ? account.id : null } });
        console.log(`Remaining: T=${tCount}, C=${cCount}`);
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
clean();
