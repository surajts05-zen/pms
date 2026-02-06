
const { Transaction, Instrument, sequelize } = require('./models');
const fs = require('fs');

(async () => {
    try {
        await sequelize.authenticate();

        const tickers = ['ITC', 'ITC.NS', 'ITCHOTELS', 'ITCHOTELS.NS'];
        const instruments = await Instrument.findAll({
            where: sequelize.where(sequelize.fn('upper', sequelize.col('ticker')), {
                [sequelize.Sequelize.Op.in]: tickers
            })
        });

        const instMap = {};
        instruments.forEach(i => instMap[i.id] = i.ticker);
        const instIds = instruments.map(i => i.id);

        if (instIds.length > 0) {
            const txns = await Transaction.findAll({
                where: { InstrumentId: instIds },
                order: [['transactionDate', 'ASC']]
            });

            const result = txns.map(t => ({
                ...t.toJSON(),
                ticker: instMap[t.InstrumentId]
            }));

            fs.writeFileSync('debug_itc.txt', JSON.stringify(result, null, 2));
            console.log(`Fetched ${txns.length} transactions for ITC/ITCHOTELS`);
        } else {
            console.log('No instruments found for ITC/ITCHOTELS');
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
