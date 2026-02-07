const { sequelize, Account, Transaction, GovtSchemeTransaction } = require('../models');

async function migrate() {
    try {
        await sequelize.sync(); // Create the new table
        console.log('Database synced. Starting migration...');

        // 1. Find all PF, PPF, SSY accounts
        const accounts = await Account.findAll({
            where: {
                type: ['pf', 'ppf', 'ssy']
            }
        });

        const accountIds = accounts.map(a => a.id);
        if (accountIds.length === 0) {
            console.log('No Government Scheme accounts found. Exiting.');
            return;
        }

        console.log(`Found ${accounts.length} Govt Scheme accounts:`, accounts.map(a => a.name));

        // 2. Find all Transactions for these accounts
        const transactions = await Transaction.findAll({
            where: {
                AccountId: accountIds
            }
        });

        console.log(`Found ${transactions.length} transactions to migrate.`);

        if (transactions.length === 0) {
            console.log('No transactions to migrate.');
            return;
        }

        // 3. Migrate each transaction
        let migratedCount = 0;
        for (const tx of transactions) {
            await GovtSchemeTransaction.create({
                id: tx.id, // Preserve UUID if possible, or let it generate new
                transactionDate: tx.transactionDate,
                description: tx.notes || `Transaction for ${tx.type}`,
                notes: tx.notes,
                amount: tx.quantity, // In Transaction table, quantity was used for amount for PF
                type: tx.type === 'deposit' ? (tx.notes === 'Annual Interest Credited' ? 'interest' : 'deposit') : 'withdrawal',
                AccountId: tx.AccountId,
                UserId: tx.UserId
            });
            migratedCount++;
        }

        console.log(`Successfully migrated ${migratedCount} transactions to GovtSchemeTransaction.`);

        // 4. Verify count
        const newCount = await GovtSchemeTransaction.count({
            where: { AccountId: accountIds }
        });

        if (newCount === transactions.length) {
            console.log('Verification successful. Counts match.');

            // 5. Delete from old table
            console.log('Deleting migrated transactions from old Transaction table...');
            await Transaction.destroy({
                where: {
                    id: transactions.map(t => t.id)
                }
            });
            console.log('Cleanup complete.');
        } else {
            console.error(`Verification FAILED! Old: ${transactions.length}, New: ${newCount}. NOT deleting old records.`);
        }

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await sequelize.close();
    }
}

migrate();
