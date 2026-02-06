const { JournalEntry, LedgerPosting, LedgerAccount } = require('./models');

async function checkData() {
    try {
        const journalCount = await JournalEntry.count();
        const postingCount = await LedgerPosting.count();
        console.log(`Journals: ${journalCount}`);
        console.log(`Postings: ${postingCount}`);

        const journals = await JournalEntry.findAll({
            include: [{
                model: LedgerPosting,
                include: [LedgerAccount]
            }],
            limit: 5
        });

        console.log('\nSample Journals with Postings:');
        journals.forEach(j => {
            console.log(`- ${j.transactionDate}: ${j.description} (ID: ${j.id})`);
            if (j.LedgerPostings) {
                j.LedgerPostings.forEach(p => {
                    console.log(`  - Account: ${p.LedgerAccount?.name || 'N/A'}, Debit: ${p.debit}, Credit: ${p.credit}`);
                });
            } else {
                console.log('  - No postings found!');
            }
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkData();
