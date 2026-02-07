const { LedgerAccount, sequelize } = require('./models');
const { Op } = require('sequelize');

async function verifyTransfers() {
    try {
        await sequelize.authenticate();

        // Check for Transfer Categories converted to Assets
        const assetAccounts = await LedgerAccount.findAll({
            where: {
                type: 'Asset',
                linkedType: 'CashflowCategory',
                name: { [Op.iLike]: '%Transfer%' }
            }
        });

        console.log('--- Converted Transfer Categories (Assets) ---');
        assetAccounts.forEach(a => console.log(`[OK] ${a.name} is now an Asset`));

        // Check for any remaining in Revenue/Expense
        const plAccounts = await LedgerAccount.findAll({
            where: {
                type: { [Op.in]: ['Revenue', 'Expense'] },
                linkedType: 'CashflowCategory',
                name: { [Op.iLike]: '%Transfer%' }
            }
        });

        if (plAccounts.length > 0) {
            console.log('\n--- Failed: Transfer Categories still in P&L ---');
            plAccounts.forEach(a => console.log(`[FAIL] ${a.name} is Type: ${a.type}`));
        } else {
            console.log('\n[SUCCESS] No Transfer categories found in P&L.');
        }

        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verifyTransfers();
