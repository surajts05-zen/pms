const { Transaction, CashflowTransaction, CashflowCategory, Account, Instrument } = require('./models');
const { Op } = require('sequelize');

async function searchShloka() {
    try {
        const trans = await Transaction.findAll({
            where: {
                notes: { [Op.like]: '%Shloka%' }
            },
            include: [Instrument, Account]
        });

        console.log(`Found ${trans.length} Transactions with "Shloka" in notes:`);
        trans.forEach(t => {
            console.log(`- ${t.transactionDate}: ${t.type} ${t.quantity} ${t.Instrument.ticker} (${t.Account.name})`);
        });

        const shlokaCat = await CashflowCategory.findOne({
            where: { name: 'HR-Shloka Stocks' }
        });

        if (shlokaCat) {
            const cfTrans = await CashflowTransaction.findAll({
                where: { CashflowCategoryId: shlokaCat.id },
                include: [Account]
            });
            console.log(`\nFound ${cfTrans.length} CashflowTransactions in "HR-Shloka Stocks":`);
            cfTrans.forEach(c => {
                console.log(`- ${c.transactionDate}: ${c.description} (${c.amount}) in ${c.Account.name} scrip: ${c.scrip}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error searching Shloka:', error);
        process.exit(1);
    }
}

searchShloka();
