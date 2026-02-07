const { CashflowCategory, LedgerAccount, sequelize } = require('../models');
const { Op } = require('sequelize');

async function migrateOthers() {
    try {
        await sequelize.authenticate();

        // Keywords for other non-P&L items
        const keywords = ['Debt', 'Repayment', 'Refund', 'Credit Card'];

        const categories = await CashflowCategory.findAll({
            where: {
                isInvestment: false,
                [Op.or]: keywords.map(k => ({ name: { [Op.iLike]: `%${k}%` } }))
            }
        });

        console.log(`Found ${categories.length} other categories to migrate (Debt/Refunds).`);
        const assetAccount = await LedgerAccount.findOne({ where: { name: 'Assets', type: 'Asset' } });

        for (const cat of categories) {
            console.log(`Migrating: ${cat.name}`);

            // Skip "Loan Payment" if ambiguous? No, user wants internal movement hidden.
            // But let's be careful. "Loan Payment" is usually expense in simple accounting?
            // "CC Debt Repayment" is definitely transfer.
            // Let's migrate them. If user wants them back in P&L, they can untick "Investment".

            cat.isInvestment = true;
            await cat.save();

            const ledger = await LedgerAccount.findOne({
                where: { linkedId: cat.id, linkedType: 'CashflowCategory' }
            });

            if (ledger) {
                ledger.type = 'Asset';
                ledger.parentId = assetAccount.id;
                await ledger.save();
                console.log(`  -> Updated ${ledger.name} to Asset`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrateOthers();
