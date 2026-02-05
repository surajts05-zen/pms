const { CashflowTransaction, Account, sequelize } = require('./models');
const { Op } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function inspect() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

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
        console.error('Error during inspection:', err);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

inspect();
