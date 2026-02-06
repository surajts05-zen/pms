
const { Transaction, Instrument, sequelize } = require('./models');
const { Op } = require('sequelize');

(async () => {
    try {
        await sequelize.authenticate();

        // Search for TMPV or anything starting with TATA or similar if not found
        let inst = await Instrument.findOne({
            where: {
                [Op.or]: [
                    { ticker: 'TMPV' },
                    { name: 'TMPV' },
                    { ticker: { [Op.like]: '%TMPV%' } }
                ]
            }
        });

        if (!inst) {
            console.log('TMPV not found directly. Searching for closest match...');
            // Fallback search, maybe user means something else
            const likely = await Instrument.findAll({
                where: {
                    ticker: { [Op.like]: '%TATA%' }
                }
            });
            console.log('Potential matches:', likely.map(i => `${i.ticker} (${i.name})`));
            return;
        }

        console.log(`Found Instrument: ${inst.ticker} (${inst.name})`);

        const txns = await Transaction.findAll({
            where: { InstrumentId: inst.id },
            order: [['transactionDate', 'ASC']]
        });

        console.log(JSON.stringify(txns, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
