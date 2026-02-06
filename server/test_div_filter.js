const { CashflowCategory, CashflowTransaction } = require('./models');
const { Op } = require('sequelize');

async function testDateFilter() {
    try {
        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income' }
        });

        if (!dividendCategory) {
            console.log('Category not found');
            return;
        }

        // Test Case 1: Specific Month April 2025
        const start1 = '2025-04-01';
        const end1 = '2025-04-30';

        console.log(`Testing range: ${start1} to ${end1}`);
        const count1 = await CashflowTransaction.count({
            where: {
                CashflowCategoryId: dividendCategory.id,
                type: 'income',
                transactionDate: {
                    [Op.gte]: start1,
                    [Op.lte]: end1
                }
            }
        });
        console.log(`Apr 2025 Count: ${count1}`);

        // Test Case 2: Full Year 2025
        const start2 = '2025-01-01';
        const end2 = '2025-12-31';

        console.log(`Testing range: ${start2} to ${end2}`);
        const count2 = await CashflowTransaction.count({
            where: {
                CashflowCategoryId: dividendCategory.id,
                type: 'income',
                transactionDate: {
                    [Op.gte]: start2,
                    [Op.lte]: end2
                }
            }
        });
        console.log(`2025 Count: ${count2}`);

    } catch (err) {
        console.error('Test Failed:', err);
    }
}

testDateFilter();
