const { Transaction, CashflowTransaction, Account, Instrument } = require('./models');

async function debugICICI() {
    try {
        const icici = await Account.findOne({ where: { name: 'ICICI' } });
        if (!icici) {
            console.log('ICICI account not found');
            process.exit(0);
        }

        console.log(`ICICI Account ID: ${icici.id}`);

        const transactions = await Transaction.findAll({
            where: { AccountId: icici.id },
            include: [Instrument]
        });

        console.log(`Found ${transactions.length} Transactions for ICICI`);
        transactions.forEach(t => {
            console.log(`- ${t.transactionDate}: ${t.type} ${t.quantity} ${t.Instrument?.ticker || 'N/A'}`);
        });

        const cashflow = await CashflowTransaction.findAll({
            where: { AccountId: icici.id }
        });

        console.log(`Found ${cashflow.length} CashflowTransactions for ICICI`);
        cashflow.slice(0, 10).forEach(c => {
            console.log(`- ${c.transactionDate}: ${c.description} (${c.amount}) scrip: ${c.scrip}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error debugging ICICI:', error);
        process.exit(1);
    }
}

debugICICI();
