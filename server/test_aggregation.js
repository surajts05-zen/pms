const { CashflowTransaction, CashflowCategory } = require('./models');
const { Op } = require('sequelize');
const sequelize = require('./db');

async function testAggregation() {
    try {
        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income' }
        });

        if (!dividendCategory) {
            console.log('Category not found');
            return;
        }

        console.log('Testing "by-year" query...');
        const results = await CashflowTransaction.findAll({
            attributes: [
                [sequelize.literal('EXTRACT(YEAR FROM "transactionDate")'), 'year'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                CashflowCategoryId: dividendCategory.id,
                type: 'income'
            },
            group: [sequelize.literal('EXTRACT(YEAR FROM "transactionDate")')],
            order: [[sequelize.literal('EXTRACT(YEAR FROM "transactionDate")'), 'ASC']],
            raw: true
        });

        console.log('Success! Results:', JSON.stringify(results, null, 2));

    } catch (err) {
        console.error('Query Failed:', err.message);
    }
}

testAggregation();
