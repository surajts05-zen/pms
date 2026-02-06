const { JournalEntry, LedgerPosting, LedgerAccount } = require('./models');

async function finalCheck() {
    try {
        const journals = await JournalEntry.findAll({
            include: [{
                model: LedgerPosting,
                include: [LedgerAccount]
            }],
            limit: 5
        });

        console.log(`Found ${journals.length} journals.`);
        journals.forEach(j => {
            console.log(`- ${j.transactionDate}: ${j.description} (ID: ${j.id})`);
            const postings = j.LedgerPostings || [];
            console.log(`  Postings count: ${postings.length}`);
            postings.forEach(p => {
                console.log(`    Account: ${p.LedgerAccount?.name || 'N/A'}, Debit: ${p.debit}, Credit: ${p.credit}`);
            });
        });

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        process.exit();
    }
}

finalCheck();
