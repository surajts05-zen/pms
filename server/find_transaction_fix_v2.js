
const { sequelize, Account, Transaction, GovtSchemeTransaction } = require('./models');

async function findTransaction() {
    try {
        console.log('Searching for transaction with description "Metro to Jayanagar"...');

        // Check GovtSchemeTransaction
        const pfTxn = await GovtSchemeTransaction.findAll({
            where: {
                notes: { [sequelize.Sequelize.Op.like]: '%Metro to Jayanagar%' }
            },
            include: [{ model: Account }]
        });

        // Also check description field if notes didn't match
        if (pfTxn.length === 0) {
            const pfTxnDesc = await GovtSchemeTransaction.findAll({
                where: {
                    description: { [sequelize.Sequelize.Op.like]: '%Metro to Jayanagar%' }
                },
                include: [{ model: Account }]
            });
            if (pfTxnDesc.length > 0) {
                console.log('Found in GovtSchemeTransaction (by description):', JSON.stringify(pfTxnDesc, null, 2));
            } else {
                console.log('Not found in GovtSchemeTransaction.');
            }
        } else {
            console.log('Found in GovtSchemeTransaction (by notes):', JSON.stringify(pfTxn, null, 2));
        }

        console.log('Searching for Transport accounts...');
        const transportAccounts = await Account.findAll({
            where: {
                name: { [sequelize.Sequelize.Op.like]: '%Travel%' }
            }
        });
        const expenseAccounts = await Account.findAll({
            where: {
                type: 'cash' // Checking cash/bank accounts to move to
            }
        });

        console.log('Travel/Transport Accounts (Category?):', JSON.stringify(transportAccounts, null, 2));
        console.log('Potential Bank/Cash Accounts:', JSON.stringify(expenseAccounts.map(a => ({ id: a.id, name: a.name })), null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

findTransaction();
