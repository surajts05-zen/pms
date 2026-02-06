const { CashflowTransaction, sequelize } = require('./models');
const { Op } = require('sequelize');

async function fixValues() {
    try {
        const transactions = await CashflowTransaction.findAll({
            where: {
                debit: 0,
                credit: 0,
                amount: { [Op.gt]: 0 }
            }
        });

        console.log(`Found ${transactions.length} records to fix.`);

        let fixedCount = 0;
        for (const t of transactions) {
            let updateData = {};
            if (t.type === 'income' || t.type === 'transfer_in' || t.type === 'dividend') {
                updateData = { credit: t.amount };
            } else if (t.type === 'expense' || t.type === 'transfer_out') {
                updateData = { debit: t.amount };
            }

            if (Object.keys(updateData).length > 0) {
                await t.update(updateData);
                fixedCount++;
            }
        }

        console.log(`Successfully updated ${fixedCount} transactions.`);
        process.exit(0);
    } catch (error) {
        console.error('Error fixing values:', error);
        process.exit(1);
    }
}

fixValues();
