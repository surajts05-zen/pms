
const { Transaction, Instrument, sequelize } = require('./models');

const updates = [
    { date: '2024-04-08', price: 374.14, qty: 24 },
    { date: '2024-05-06', price: 377.66, qty: 22 },
    { date: '2024-05-08', price: 383.22, qty: 2 },
    { date: '2024-07-05', price: 372.75, qty: 11 },
    { date: '2024-12-18', price: 408.92, qty: 105 }
];

(async () => {
    try {
        await sequelize.authenticate();
        const inst = await Instrument.findOne({ where: { ticker: 'ITC.NS' } });

        if (!inst) {
            console.log('ITC.NS not found');
            return;
        }

        for (const update of updates) {
            const txn = await Transaction.findOne({
                where: {
                    InstrumentId: inst.id,
                    transactionDate: update.date,
                    // quantity: update.qty // Optional safeguard, usually date is enough if unique per day
                }
            });

            if (txn) {
                console.log(`Updating ${update.date}: ${txn.price} -> ${update.price}`);
                txn.price = update.price;
                await txn.save();
            } else {
                console.log(`Transaction NOT FOUND for ${update.date}`);
            }
        }

        console.log('Done.');

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
