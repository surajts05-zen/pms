const { CashflowTransaction, CashflowCategory } = require('./models');
const { Op } = require('sequelize');
const fs = require('fs');

async function debug() {
    try {
        const cat = await CashflowCategory.findOne({ where: { name: 'Dividend' } });
        if (!cat) {
            fs.writeFileSync('debug_div_out.txt', 'Category Dividend not found');
            return;
        }

        const total = await CashflowTransaction.count({ where: { CashflowCategoryId: cat.id } });
        const income = await CashflowTransaction.count({ where: { CashflowCategoryId: cat.id, type: 'income' } });
        const missingType = await CashflowTransaction.count({ where: { CashflowCategoryId: cat.id, type: { [Op.ne]: 'income' } } });

        let output = `Dividend Category ID: ${cat.id}\n`;
        output += `Total Transactions with this Category: ${total}\n`;
        output += `Transactions with type 'income': ${income}\n`;
        output += `Transactions with other types: ${missingType}\n\n`;

        if (missingType > 0) {
            const badTypes = await CashflowTransaction.findAll({
                attributes: ['type', 'id', 'description'],
                where: { CashflowCategoryId: cat.id, type: { [Op.ne]: 'income' } },
                raw: true
            });
            output += `Bad Types Found:\n${JSON.stringify(badTypes, null, 2)}\n`;
        }

        if (total > 0) {
            const sample = await CashflowTransaction.findOne({ where: { CashflowCategoryId: cat.id }, raw: true });
            output += `\nSample Transaction:\n${JSON.stringify(sample, null, 2)}\n`;
        }

        fs.writeFileSync('debug_div_out.txt', output);
        console.log('Done writing debug_div_out.txt');

    } catch (err) {
        console.error(err);
        fs.writeFileSync('debug_div_out.txt', `Error: ${err.message}`);
    }
}

debug();
