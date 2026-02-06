const { CashflowTransaction, CashflowCategory } = require('./models');
const { Op } = require('sequelize');

async function inspect() {
    try {
        const dividendCategory = await CashflowCategory.findOne({ where: { name: 'Dividend' } });
        if (!dividendCategory) {
            console.log('Dividend category not found');
            return;
        }

        const txns = await CashflowTransaction.findAll({
            where: { CashflowCategoryId: dividendCategory.id },
            limit: 20
        });

        console.log(`Found ${txns.length} categorized dividends:`);
        txns.forEach(t => {
            console.log(`Date: ${t.transactionDate}, Amount: ${t.amount}, Scrip: ${t.scrip}, Desc: ${t.description}`);
        });

    } catch (err) {
        console.error(err);
    }
}

inspect();
