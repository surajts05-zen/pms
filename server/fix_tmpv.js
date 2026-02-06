
const { Transaction, Instrument, sequelize } = require('./models');

const updates = [
    { date: '2023-09-01', price: 422.97 },
    { date: '2023-10-06', price: 431.84 },
    { date: '2024-07-05', price: 691.83 }
];

const deleteId = 'c62f9fb5-5018-4f14-bec8-70fc0c885a84'; // The fractional buy

(async () => {
    try {
        await sequelize.authenticate();
        // We know the IDs from debug_tmpv.txt, but finding by date/instrument is safer/generic if we didn't hardcode ID
        // However, I have IDs in the artifact, so I can use them or just search properly.
        // Let's search by InstrumentId to be sure.

        // Find Instrument again to get ID, or use ID from debug file 'feda88d2-c11e-43d6-9a57-c435832853fe'
        const instId = 'feda88d2-c11e-43d6-9a57-c435832853fe';

        for (const update of updates) {
            const txn = await Transaction.findOne({
                where: {
                    InstrumentId: instId,
                    transactionDate: update.date,
                    type: 'buy'
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

        // Delete fractional
        const delTxn = await Transaction.destroy({ where: { id: deleteId } });
        console.log(`Deleted ${delTxn} transaction(s) (Fractional).`);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
