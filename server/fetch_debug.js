
const { Transaction, Instrument, sequelize } = require('./models');
const fs = require('fs');

(async () => {
    try {
        await sequelize.authenticate();
        let inst = await Instrument.findOne({ where: { name: 'BAJFINANCE' } });
        if (!inst) {
            inst = await Instrument.findOne({ where: { ticker: 'BAJFINANCE' } });
        }

        if (inst) {
            console.log('Found Instrument:', inst.name, inst.ticker);
            const txns = await Transaction.findAll({
                where: { InstrumentId: inst.id },
                order: [['transactionDate', 'ASC']]
            });
            fs.writeFileSync('debug_baj_out.txt', JSON.stringify(txns, null, 2));
            console.log('Written to debug_baj_out.txt');
        } else {
            console.log('Instrument NOT FOUND');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
