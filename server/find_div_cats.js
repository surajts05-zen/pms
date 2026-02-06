const { CashflowCategory } = require('./models');
const { Op } = require('sequelize');

async function findDivCats() {
    try {
        const cats = await CashflowCategory.findAll({
            where: {
                name: { [Op.iLike]: '%div%' }
            },
            raw: true
        });
        console.log('Categories matching "div":');
        cats.forEach(c => console.log(`${c.id} | ${c.name} | ${c.type}`));
    } catch (err) {
        console.error(err);
    }
}

findDivCats();
