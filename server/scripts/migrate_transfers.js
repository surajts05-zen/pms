const { CashflowCategory, LedgerAccount, sequelize } = require('../models');
const { Op } = require('sequelize');

async function migrateTransfers() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Identify Transfer Categories
        const categories = await CashflowCategory.findAll({
            where: {
                name: { [Op.iLike]: '%Transfer%' },
                isInvestment: false // only migrate ones not already migrated
            }
        });

        console.log(`Found ${categories.length} Transfer categories to migrate.`);
        const assetAccount = await LedgerAccount.findOne({ where: { name: 'Assets', type: 'Asset' } });

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

        console.log('Transfer migration complete.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateTransfers();
