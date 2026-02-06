const { CashflowTransaction, CashflowCategory } = require('./models');
const { Op } = require('sequelize');
const fs = require('fs');

async function identify() {
    try {
        const dividendCategory = await CashflowCategory.findOne({ where: { name: 'Dividend' } });
        if (!dividendCategory) {
            console.log('Dividend category not found');
            return;
        }

        const txns = await CashflowTransaction.findAll({
            where: {
                [Op.and]: [
                    {
                        [Op.or]: [
                            { description: { [Op.iLike]: '%dividend%' } },
                            { description: { [Op.iLike]: '%div %' } },
                            { description: { [Op.iLike]: '% div %' } }
                        ]
                    },
                    {
                        [Op.or]: [
                            { CashflowCategoryId: { [Op.ne]: dividendCategory.id } },
                            { CashflowCategoryId: null }
                        ]
                    }
                ]
            }
        });

        console.log(`Found ${txns.length} potential dividends not categorized as Dividend.`);
        fs.writeFileSync('potential_dividends.json', JSON.stringify(txns, null, 2));
        console.log('Saved to potential_dividends.json');

    } catch (err) {
        console.error(err);
    }
}

identify();
