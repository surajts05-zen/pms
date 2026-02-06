const { JournalEntry, LedgerPosting, LedgerAccount, sequelize } = require('./models');

async function findZeroPostings() {
    try {
        console.log('Finding journals where ALL postings have 0 debit and 0 credit...');

        // Find journals that HAVE postings but they are all 0
        const journals = await JournalEntry.findAll({
            include: [{
                model: LedgerPosting,
                include: [LedgerAccount]
            }]
        });

        const faulty = journals.filter(j =>
            j.LedgerPostings.length > 0 &&
            j.LedgerPostings.every(p => parseFloat(p.debit) === 0 && parseFloat(p.credit) === 0)
        );

        console.log(`Found ${faulty.length} journals with only zero-value postings.`);

        for (const j of faulty.slice(0, 5)) {
            console.log(`- Journal: ${j.description}, Date: ${j.transactionDate}, ID: ${j.id}, Ref: ${j.referenceType}`);
            // Check associated CashflowTransaction
            if (j.referenceType === 'CashflowTransaction') {
                const { CashflowTransaction } = require('./models');
                const txn = await CashflowTransaction.findByPk(j.referenceId);
                console.log(`  Source Txn: Amount=${txn?.amount}, Debit=${txn?.debit}, Credit=${txn?.credit}, Type=${txn?.type}`);
            }
        }

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        process.exit();
    }
}
findZeroPostings();
