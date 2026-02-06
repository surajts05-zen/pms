const sequelize = require('./db');

async function fixFKs() {
    try {
        console.log('Checking columns in LedgerPostings...');
        const [results] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'LedgerPostings'");
        const columns = results.map(r => r.column_name);
        console.log('Existing columns:', columns);

        if (columns.includes('JournalEntryId') && !columns.includes('journalEntryId')) {
            console.log('Renaming JournalEntryId to journalEntryId...');
            await sequelize.query('ALTER TABLE "LedgerPostings" RENAME COLUMN "JournalEntryId" TO "journalEntryId"');
        }

        if (columns.includes('LedgerAccountId') && !columns.includes('ledgerAccountId')) {
            console.log('Renaming LedgerAccountId to ledgerAccountId...');
            await sequelize.query('ALTER TABLE "LedgerPostings" RENAME COLUMN "LedgerAccountId" TO "ledgerAccountId"');
        }

        // Also check if some records have nulls but uppercase had data (unlikely if renaming worked)
        console.log('Fix complete.');

    } catch (err) {
        console.error('Migration Error:', err);
    } finally {
        process.exit();
    }
}

fixFKs();
