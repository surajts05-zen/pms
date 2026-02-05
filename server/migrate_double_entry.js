const { CashflowTransaction, sequelize } = require('./models');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // Sync model to add columns if they don't exist
        await CashflowTransaction.sync({ alter: true });
        console.log('Table schema updated.');

        const transactions = await CashflowTransaction.findAll();
        console.log(`Found ${transactions.length} transactions to migrate.`);

        for (const txn of transactions) {
            const amount = parseFloat(txn.amount);
            let debit = 0;
            let credit = 0;

            if (txn.type === 'income' || txn.type === 'transfer_in') {
                debit = amount;
            } else if (txn.type === 'expense' || txn.type === 'transfer_out') {
                credit = amount;
            } else if (txn.type === 'transfer') {
                // Default to credit for generic 'transfer' type if found
                credit = amount;
            }

            await txn.update({ debit, credit });
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
