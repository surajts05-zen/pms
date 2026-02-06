const { CashflowTransaction, Account, CashflowCategory } = require('./models');

async function finalCheck() {
    try {
        const sharekhan = await Account.findOne({ where: { name: 'Sharekhan - Conservative' } });
        const zerodha = await Account.findOne({ where: { name: 'Zerodha - Aspirational' } });

        console.log('--- SHAREKHAN RECORDS ---');
        const skTrans = await CashflowTransaction.findAll({
            where: { AccountId: sharekhan?.id },
            include: [CashflowCategory],
            order: [['transactionDate', 'ASC']]
        });
        skTrans.forEach(t => {
            console.log(`[${t.transactionDate}] ${t.description} | Amt: ${t.amount} | Cat: ${t.CashflowCategory?.name} | Scrip: ${t.scrip}`);
        });

        console.log('\n--- ZERODHA RECORDS ---');
        const zTrans = await CashflowTransaction.findAll({
            where: { AccountId: zerodha?.id },
            include: [CashflowCategory],
            order: [['transactionDate', 'ASC']]
        });
        zTrans.forEach(t => {
            console.log(`[${t.transactionDate}] ${t.description} | Amt: ${t.amount} | Cat: ${t.CashflowCategory?.name} | Scrip: ${t.scrip}`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error in final check:', error);
        process.exit(1);
    }
}

finalCheck();
