const sequelize = require('./db');

async function verify() {
    try {
        const [[{ count: journals }]] = await sequelize.query('SELECT count(*) FROM "JournalEntries"');
        const [[{ count: postings }]] = await sequelize.query('SELECT count(*) FROM "LedgerPostings"');
        const [[{ count: linked }]] = await sequelize.query('SELECT count(*) FROM "LedgerPostings" WHERE "journalEntryId" IS NOT NULL');
        const [[{ count: orphaned }]] = await sequelize.query('SELECT count(*) FROM "LedgerPostings" WHERE "journalEntryId" IS NULL');

        console.log(`Total Journals: ${journals}`);
        console.log(`Total Postings: ${postings}`);
        console.log(`Linked Postings: ${linked}`);
        console.log(`Orphaned Postings: ${orphaned}`);

        if (orphaned > 0) {
            console.log('\nSample orphaned postings:');
            const [samples] = await sequelize.query('SELECT id, debit, credit, "createdAt" FROM "LedgerPostings" WHERE "journalEntryId" IS NULL LIMIT 5');
            console.log(samples);
        }

    } catch (err) {
        console.error('Verify failed:', err);
    } finally {
        process.exit();
    }
}
verify();
