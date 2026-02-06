const { CashflowTransaction, Account } = require('./models');

async function checkValues() {
    try {
        const sharekhan = await Account.findOne({ where: { name: 'Sharekhan - Conservative' } });
        const zerodha = await Account.findOne({ where: { name: 'Zerodha - Aspirational' } });

        console.log('--- CHECKING VALUES ---');

        const accounts = [sharekhan, zerodha].filter(Boolean);
        for (const acc of accounts) {
            console.log(`\nAccount: ${acc.name}`);
            const trans = await CashflowTransaction.findAll({
                where: { AccountId: acc.id },
                limit: 10,
                order: [['transactionDate', 'DESC']]
            });
            trans.forEach(t => {
                console.log(`[${t.transactionDate}] ${t.description} | Amt: ${t.amount} | Dr: ${t.debit} | Cr: ${t.credit} | Type: ${t.type}`);
            });
        }

        process.exit(0);
    } catch (error) {
        console.error('Error checking values:', error);
        process.exit(1);
    }
}

checkValues();
