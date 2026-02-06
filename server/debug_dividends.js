const { CashflowCategory, CashflowTransaction } = require('./models');
const { Op } = require('sequelize');

async function debug() {
    try {
        const cat = await CashflowCategory.findOne({ where: { name: 'Dividend' } });
        if (!cat) {
            console.log('Category Dividend not found');
            return;
        }

        const total = await CashflowTransaction.count({ where: { CashflowCategoryId: cat.id } });
        const income = await CashflowTransaction.count({ where: { CashflowCategoryId: cat.id, type: 'income' } });
        const missingType = await CashflowTransaction.count({ where: { CashflowCategoryId: cat.id, type: { [Op.ne]: 'income' } } });

        console.log(`Dividend Category ID: ${cat.id}`);
        console.log(`Total Transactions with this Category: ${total}`);
        console.log(`Transactions with type 'income': ${income}`);
        console.log(`Transactions with other types: ${missingType}`);

        if (total > 0) {
            const sample = await CashflowTransaction.findOne({ where: { CashflowCategoryId: cat.id }, raw: true });
            console.log('\nSample Transaction:');
            console.log(JSON.stringify(sample, null, 2));
        }

    } catch (err) {
        console.error(err);
    }
}

debug();
