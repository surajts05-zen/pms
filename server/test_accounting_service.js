const { CashflowTransaction, Account, JournalEntry, LedgerPosting, LedgerAccount, sequelize } = require('./models');
const AccountingService = require('./accountingService');

async function testAccounting() {
    try {
        await sequelize.authenticate();
        console.log('--- Accounting Verification ---');

        // 1. Get a sample Income transaction
        const incomeTx = await CashflowTransaction.findOne({ where: { type: 'income' } });
        if (incomeTx) {
            console.log(`Testing Income Transaction: ${incomeTx.description} (${incomeTx.amount})`);
            await AccountingService.processCashflowTransaction(incomeTx);
        }

        // 2. Get a sample Expense transaction
        const expenseTx = await CashflowTransaction.findOne({ where: { type: 'expense' } });
        if (expenseTx) {
            console.log(`Testing Expense Transaction: ${expenseTx.description} (${expenseTx.amount})`);
            await AccountingService.processCashflowTransaction(expenseTx);
        }

        // 3. Test Stock Buy Example
        const bankAcc = await Account.findOne({ where: { type: 'bank' } });
        const dematAcc = await Account.findOne({ where: { type: 'demat' } });

        if (bankAcc && dematAcc) {
            console.log(`Testing Stock Buy Example...`);
            await AccountingService.recordStockBuyExample({
                date: '2026-02-01',
                scrip: 'TATAMOTORS',
                quantity: 10,
                price: 900,
                fees: 50,
                bankAccountId: bankAcc.id,
                dematAccountId: dematAcc.id
            });
        }

        // 4. Verify Results
        const journals = await JournalEntry.findAll({ include: [LedgerPosting] });
        console.log(`\nVerification Summary:`);
        console.log(`Total Journals Created: ${journals.length}`);

        for (const j of journals) {
            const debits = j.LedgerPostings.reduce((sum, p) => sum + parseFloat(p.debit), 0);
            const credits = j.LedgerPostings.reduce((sum, p) => sum + parseFloat(p.credit), 0);
            console.log(`Journal: ${j.description} | Debits: ${debits} | Credits: ${credits} | Status: ${debits === credits ? 'BALANCED' : 'UNBALANCED'}`);
        }

        console.log('\n--- Verification Complete ---');
        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

testAccounting();
