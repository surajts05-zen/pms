const { CashflowCategory, LedgerAccount, sequelize } = require('./models');
const { Op } = require('sequelize');

async function inspectTransfers() {
    try {
        await sequelize.authenticate();

        // Find Categories with "Transfer"
        const transferCats = await CashflowCategory.findAll({
            where: {
                name: { [Op.iLike]: '%Transfer%' }
            }
        });

        console.log('--- Cashflow Categories with "Transfer" ---');
        for (const cat of transferCats) {
            const ledger = await LedgerAccount.findOne({
                where: { linkedId: cat.id, linkedType: 'CashflowCategory' }
            });
            console.log(`- [${cat.name}] Type: ${cat.type} | IsInvestment: ${cat.isInvestment}`);
            if (ledger) {
                console.log(`  -> Ledger: ${ledger.name} (Type: ${ledger.type})`);
            } else {
                console.log(`  -> No Ledger Account found!`);
            }
        }

        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectTransfers();
