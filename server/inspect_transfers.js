const { CashflowTransaction, Account } = require('./models');
const { Op } = require('sequelize');

async function inspect() {
    try {
        const transfers = await CashflowTransaction.findAll({
            where: {
                type: 'transfer',
                transactionDate: {
                    [Op.between]: ['2025-04-01', '2025-04-30']
                }
            },
            include: [Account],
            order: [['transactionDate', 'ASC'], ['amount', 'ASC']]
        });

        console.log(`Found ${transfers.length} transfers in April 2025:`);
        transfers.forEach(t => {
            console.log(`${t.transactionDate} | ${t.Account.name.padEnd(20)} | Amount: ${t.amount.toString().padStart(10)} | Description: ${t.description} | LinkedID: ${t.linkedTransactionId || 'None'}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

inspect();
