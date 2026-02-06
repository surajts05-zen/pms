const { CashflowTransaction, Account, CashflowCategory, sequelize } = require('./models');

async function verifySync() {
    try {
        const sharekhan = await Account.findOne({ where: { name: 'Sharekhan - Conservative' } });
        const zerodha = await Account.findOne({ where: { name: 'Zerodha - Aspirational' } });

        console.log('VERIFICATION_START');

        if (sharekhan) {
            const skCount = await CashflowTransaction.count({ where: { AccountId: sharekhan.id } });
            console.log(`Sharekhan - Conservative: ${skCount} transactions`);
            const samples = await CashflowTransaction.findAll({
                where: { AccountId: sharekhan.id },
                limit: 5,
                order: [['transactionDate', 'DESC']],
                include: [CashflowCategory]
            });
            samples.forEach(s => {
                console.log(`- [${s.transactionDate}] ${s.description} | Amt: ${s.amount} | Cat: ${s.CashflowCategory?.name}`);
            });
        }

        if (zerodha) {
            const zCount = await CashflowTransaction.count({ where: { AccountId: zerodha.id } });
            console.log(`Zerodha - Aspirational: ${zCount} transactions`);
            const samples = await CashflowTransaction.findAll({
                where: { AccountId: zerodha.id },
                limit: 5,
                order: [['transactionDate', 'DESC']],
                include: [CashflowCategory]
            });
            samples.forEach(s => {
                console.log(`- [${s.transactionDate}] ${s.description} | Amt: ${s.amount} | Cat: ${s.CashflowCategory?.name}`);
            });
        }

        console.log('VERIFICATION_END');
        process.exit(0);
    } catch (error) {
        console.error('Error during verification:', error);
        process.exit(1);
    }
}

verifySync();
