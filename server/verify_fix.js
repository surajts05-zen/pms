const { LedgerAccount, sequelize } = require('./models');
const { Op } = require('sequelize');

async function verify() {
    try {
        await sequelize.authenticate();

        // Check for Categories converted to Assets
        const assetAccounts = await LedgerAccount.findAll({
            where: {
                type: 'Asset',
                linkedType: 'CashflowCategory'
            }
        });

        console.log('--- Converted Asset Categories ---');
        assetAccounts.forEach(a => console.log(`[OK] ${a.name} is now an Asset`));

        if (assetAccounts.length === 0) {
            console.error('FAILED: No categories found under Assets!');
        }

        // Check if any remain as Expense (should handle this if migration missed any?)
        // searching for common investment keywords
        const keywords = ['Start', 'Invest', 'Stock', 'Mutual', 'SIP', 'PPF', 'SSY', 'FD', 'Gold'];
        const expenseAccounts = await LedgerAccount.findAll({
            where: {
                type: 'Expense',
                linkedType: 'CashflowCategory',
                [Op.or]: keywords.map(k => ({ name: { [Op.like]: `%${k}%` } }))
            }
        });

        if (expenseAccounts.length > 0) {
            console.log('\n--- Warnings: Potential Investments still as Expense ---');
            expenseAccounts.forEach(a => console.log(`[WARN] ${a.name} is still Type: ${a.type}`));
        } else {
            console.log('\n[OK] No obvious investment categories found in Expenses.');
        }

        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verify();
