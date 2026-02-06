
const { Transaction, sequelize } = require('./models');

(async () => {
    try {
        await sequelize.authenticate();
        // ID identified from debug_baj_out.txt for the Bonus transaction
        const bonusTxnId = '6176db42-7135-4cff-9ae2-f6dbd4bf8644';

        const txn = await Transaction.findByPk(bonusTxnId);
        if (txn) {
            console.log(`Current Quantity: ${txn.quantity}`);
            txn.quantity = 4.0;
            await txn.save();
            console.log(`Updated Quantity to: ${txn.quantity}`);
        } else {
            console.log('Transaction not found');
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
