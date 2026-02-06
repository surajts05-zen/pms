
const { Transaction, Instrument, sequelize } = require('./models');
const { Op } = require('sequelize');
const fs = require('fs');

(async () => {
    try {
        await sequelize.authenticate();

        let inst = await Instrument.findOne({
            where: {
                [Op.or]: [
                    { ticker: 'TMPV' }, // User calls it TMPV
                    { name: 'TMPV' }
                ]
            }
        });

        if (!inst) {
            // Fallback: check if user meant something else found in previous logs or known DB state
            // Based on previous logs, maybe I should search specifically for what was found.
            // But let's stick to TMPV first. If null, I'll list all instruments to find it.
            const all = await Instrument.findAll();
            const map = all.map(i => `${i.ticker}|${i.name}`).join('\n');
            fs.writeFileSync('all_instruments_debug.txt', map);
            console.log('TMPV not found. Dumped all instruments.');
            return;
        }

        console.log(`Found Instrument: ${inst.ticker} (${inst.name})`);

        const txns = await Transaction.findAll({
            where: { InstrumentId: inst.id },
            order: [['transactionDate', 'ASC']]
        });

        fs.writeFileSync('debug_tmpv.txt', JSON.stringify(txns, null, 2));
        console.log('Written to debug_tmpv.txt');

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
