const { JournalEntry, LedgerPosting, sequelize } = require('./models');

async function repair() {
    try {
        console.log('Starting data repair...');

        // 1. Delete automated journals (these will be re-migrated)
        const deletedJournals = await JournalEntry.destroy({
            where: {
                referenceType: { [sequelize.Sequelize.Op.ne]: 'Manual' }
            }
        });
        console.log(`Deleted ${deletedJournals} automated journals.`);

        // 2. Delete ALL orphaned postings (null FK or pointing to deleted journals)
        // Since we unified FKs, rows with null journalEntryId are effectively orphaned
        const deletedPostings = await LedgerPosting.destroy({
            where: {
                journalEntryId: null
            }
        });
        console.log(`Deleted ${deletedPostings} orphaned postings with null FK.`);

        // Also cleanup postings where journal might have been deleted but FK was not null (if any)
        // (In Postgres, if CASCADE is set it might have handled it, but let's be sure)
        const [orphaned] = await sequelize.query('DELETE FROM "LedgerPostings" WHERE "journalEntryId" NOT IN (SELECT id FROM "JournalEntries")');
        console.log('Cleanup of orphaned postings pointing to non-existent journals complete.');

        console.log('Repair complete. Ready for re-migration.');

    } catch (err) {
        console.error('Repair failed:', err);
    } finally {
        process.exit();
    }
}

repair();
