const { CashflowCategory } = require('./models');

async function listCats() {
    try {
        const cats = await CashflowCategory.findAll({ raw: true });
        console.log('ID | Name | Type');
        cats.forEach(c => {
            console.log(`${c.id} | ${c.name} | ${c.type}`);
        });
    } catch (err) {
        console.error(err);
    }
}

listCats();
