const { CashflowTransaction, Account, sequelize } = require('./models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function verify() {
    try {
        await sequelize.authenticate();

        const transfers = await CashflowTransaction.findAll({
            where: {
                type: { [Op.in]: ['transfer', 'transfer_in', 'transfer_out'] },
                transactionDate: {
                    [Op.between]: ['2025-04-01', '2025-04-30']
                }
            },
            include: [Account],
            order: [['transactionDate', 'ASC'], ['amount', 'ASC']]
        });

        let output = `Found ${transfers.length} transfers in April 2025:\n`;
        transfers.forEach(t => {
            output += `${t.transactionDate} | ${t.Account.name.padEnd(20)} | Type: ${t.type.padEnd(12)} | Amount: ${t.amount.toString().padStart(10)} | Description: ${t.description}\n`;
        });

        fs.writeFileSync('transfer_verification.txt', output);
        console.log('Verification data written to transfer_verification.txt');

    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

verify();
