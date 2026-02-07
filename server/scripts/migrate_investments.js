const { CashflowCategory, LedgerAccount, sequelize } = require('../models');
const { Op } = require('sequelize');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Identify Investment Categories
        const keywords = ['Start', 'Invest', 'Stock', 'Mutual', 'SIP', 'PPF', 'SSY', 'FD', 'Gold', 'Recurring', 'NPS', 'Provident'];

        const categories = await CashflowCategory.findAll({
            where: {
                type: 'expense', // Investments are usually outgoing money initially categorized as expense
                [Op.or]: keywords.map(k => ({ name: { [Op.like]: `%${k}%` } }))
            }
        });

        console.log(`Found ${categories.length} potential investment categories.`);

        const assetAccount = await LedgerAccount.findOne({ where: { name: 'Assets', type: 'Asset' } });
        if (!assetAccount) {
            throw new Error('Assets base account not found!');
        }

        for (const cat of categories) {
            console.log(`Migrating: ${cat.name}`);

            // Update Category
            cat.isInvestment = true;
            await cat.save();

            // Update Ledger Account
            const ledger = await LedgerAccount.findOne({
                where: { linkedId: cat.id, linkedType: 'CashflowCategory' }
            });

            if (ledger) {
                ledger.type = 'Asset';
                ledger.parentId = assetAccount.id;
                await ledger.save();
                console.log(`  -> Updated LedgerAccount ${ledger.name} to Asset`);
            } else {
                console.warn(`  -> No LedgerAccount found for ${cat.name}`);
            }
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
