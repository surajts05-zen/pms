
const { Transaction, sequelize } = require('./models');

(async () => {
    try {
        await sequelize.authenticate();
        const invalidTxnId = '34ac8c06-0350-4a28-9594-00b6b3d6a409'; // 0.8649 ITC

        const deleted = await Transaction.destroy({ where: { id: invalidTxnId } });
        console.log(`Deleted ${deleted} transaction(s).`);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
