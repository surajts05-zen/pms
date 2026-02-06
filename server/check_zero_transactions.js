const { CashflowTransaction, JournalEntry, LedgerPosting, sequelize } = require('./models');

async function checkZeros() {
    try {
        console.log('Checking for transactions with zero amount/debit/credit...');
        const transactions = await CashflowTransaction.findAll({
            where: {
                [sequelize.Sequelize.Op.and]: [
                    { amount: 0 },
                    { debit: 0 },
                    { credit: 0 }
                ]
            }
        });

        console.log(`Found ${transactions.length} transactions with zero values.`);

        for (const txn of transactions.slice(0, 10)) {
            console.log(`- Txn: ${txn.description}, Date: ${txn.transactionDate}, ID: ${txn.id}`);
            const journal = await JournalEntry.findOne({
                where: { referenceId: txn.id, referenceType: 'CashflowTransaction' },
                include: [LedgerPosting]
            });
            if (journal) {
                console.log(`  Linked Journal Found: ${journal.id}`);
                console.log(`  Postings count: ${journal.LedgerPostings.length}`);
            } else {
                console.log('  No linked journal found.');
            }
        }

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        process.exit();
    }
}
checkZeros();
