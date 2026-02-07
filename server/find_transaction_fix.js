
const { sequelize, Account, Transaction, PfTransaction } = require('./models');

async function findTransaction() {
    try {
        console.log('Searching for transaction...');
        // Check PfTransaction first as it's in GovtSchemes
        const pfTxn = await PfTransaction.findAll({
            where: {
                description: { [sequelize.Sequelize.Op.like]: '%Metro to Jayanagar%' }
            },
            include: [{ model: Account }]
        });

        console.log('Found in PfTransaction:', JSON.stringify(pfTxn, null, 2));

        // Also check regular Transaction just in case
        const txn = await Transaction.findAll({
            where: {
                description: { [sequelize.Sequelize.Op.like]: '%Metro to Jayanagar%' }
            },
            include: [{ model: Account }]
        });
        console.log('Found in Transaction:', JSON.stringify(txn, null, 2));

        console.log('Searching for Transport accounts...');
        const transportAccounts = await Account.findAll({
            where: {
                name: { [sequelize.Sequelize.Op.like]: '%Transport%' }
            }
        });
        console.log('Transport Accounts:', JSON.stringify(transportAccounts, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

findTransaction();
