const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Account, CashflowTransaction, sequelize } = require('./models');
const { Op } = require('sequelize');

async function migrateOpeningBalances() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const accounts = await Account.findAll();

        for (const account of accounts) {
            console.log(`Processing account: ${account.name}`);

            // Find "Opening Balance" or "o/b" transactions for this account
            const obTransactions = await CashflowTransaction.findAll({
                where: {
                    AccountId: account.id,
                    [Op.or]: [
                        { description: { [Op.iLike]: '%Opening Balance%' } },
                        { description: { [Op.iLike]: '%o/b%' } }
                    ]
                },
                order: [['transactionDate', 'ASC']]
            });

            if (obTransactions.length > 0) {
                console.log(`  Found ${obTransactions.length} opening balance transactions.`);

                // Usually there should be only one per account per start of period.
                // We'll take the earliest one as the official opening balance.
                const firstOB = obTransactions[0];
                const amount = parseFloat(firstOB.debit || 0) - parseFloat(firstOB.credit || 0);

                console.log(`  Setting opening balance to ${amount} as of ${firstOB.transactionDate}`);

                await account.update({
                    openingBalance: amount,
                    openingBalanceDate: firstOB.transactionDate
                });

                // Delete the transactions to prevent double counting
                const idsToDelete = obTransactions.map(t => t.id);
                await CashflowTransaction.destroy({
                    where: { id: idsToDelete }
                });
                console.log(`  Deleted migrated transactions.`);
            } else {
                console.log(`  No opening balance transactions found.`);
            }
        }

        console.log('\nMigration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateOpeningBalances();
