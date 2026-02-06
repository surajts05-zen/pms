const { CashflowTransaction, Account } = require('./models');
const { Op } = require('sequelize');

async function findMissingValues() {
    try {
        const missing = await CashflowTransaction.findAll({
            where: {
                debit: 0,
                credit: 0,
                amount: { [Op.gt]: 0 }
            },
            include: [Account]
        });

        console.log(`Found ${missing.length} transactions with missing debit/credit values.`);

        const accountStats = {};
        missing.forEach(m => {
            accountStats[m.Account.name] = (accountStats[m.Account.name] || 0) + 1;
        });

        console.log('Stats by Account:');
        console.log(JSON.stringify(accountStats, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Error finding missing values:', error);
        process.exit(1);
    }
}

findMissingValues();
