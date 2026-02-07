const { CashflowTransaction, JournalEntry, sequelize } = require('../models');
const AccountingService = require('../accountingService');

async function backfillJournals() {
    try {
        console.log('Starting Journal Entry Backfill...');

        // 1. Fetch all Cashflow Transactions
        const transactions = await CashflowTransaction.findAll({
            order: [['transactionDate', 'ASC']]
        });
        console.log(`Found ${transactions.length} total cashflow transactions.`);

        let createdCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const transaction of transactions) {
            // 2. Check if Journal Entry exists
            const existingJournal = await JournalEntry.findOne({
                where: {
                    referenceId: transaction.id,
                    referenceType: 'CashflowTransaction'
                }
            });

            if (existingJournal) {
                skippedCount++;
                // console.log(`Skipping transaction ${transaction.id} - Journal already exists.`);
                continue;
            }

            // 3. Create Journal Entry
            try {
                console.log(`Creating journal for transaction ${transaction.id} (${transaction.description})...`);
                await AccountingService.processCashflowTransaction(transaction);
                createdCount++;
            } catch (err) {
                console.error(`Failed to create journal for transaction ${transaction.id}:`, err.message);
                errorCount++;
            }
        }

        console.log('\n--- Backfill Summary ---');
        console.log(`Total Transactions: ${transactions.length}`);
        console.log(`Journals Created:   ${createdCount}`);
        console.log(`Journals Skipped:   ${skippedCount}`);
        console.log(`Errors Encountered: ${errorCount}`);
        console.log('------------------------');

    } catch (error) {
        console.error('Backfill script error:', error);
    } finally {
        // await sequelize.close(); // Keep connection open if running via require, but good to iterate
        process.exit();
    }
}

// Run if called directly
if (require.main === module) {
    backfillJournals();
}

module.exports = backfillJournals;
