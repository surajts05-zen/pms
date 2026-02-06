const { CashflowTransaction, Account, sequelize } = require('./models');

async function debug() {
    const UserId = 'a18b80a4-9e20-46cd-854e-708ab2c11ed7';
    try {
        await sequelize.authenticate();
        const account = await Account.findOne({ where: { type: 'pf', UserId } });
        const cfs = await CashflowTransaction.findAll({ where: { AccountId: account.id } });

        console.log(`Cashflow Count: ${cfs.length}`);
        let sum = 0;
        cfs.forEach((cf, i) => {
            sum += parseFloat(cf.credit);
            if (i < 5) console.log(`${cf.transactionDate} | ${cf.credit} | ${cf.description}`);
        });
        console.log(`Calculated Sum: ${sum}`);
        console.log(`Account Balance in DB: ${account.balance}`);
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
debug();
