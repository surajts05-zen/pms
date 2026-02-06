const { CashflowTransaction, sequelize } = require('./models');
const AccountingService = require('./accountingService');

async function migrateToJournals() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        const transactions = await CashflowTransaction.findAll({
            order: [['transactionDate', 'ASC']]
        });

        console.log(`Found ${transactions.length} transactions to migrate.`);

        for (const txn of transactions) {
            try {
                // We'll skip if a journal for this reference already exists (idempotency)
                const { JournalEntry } = require('./models');
                const existing = await JournalEntry.findOne({
                    where: { referenceId: txn.id, referenceType: 'CashflowTransaction' }
                });

                if (existing) {
                    console.log(`Skipping txn ${txn.id} - Journal already exists.`);
                    continue;
                }

                await AccountingService.processCashflowTransaction(txn);
            } catch (err) {
                console.error(`Error migrating txn ${txn.id}:`, err.message);
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateToJournals();
