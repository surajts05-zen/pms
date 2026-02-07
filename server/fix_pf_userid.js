const { User, Account, Transaction, CashflowTransaction, sequelize } = require('./models');

async function fixUserId() {
    const WRONG_ID = 'a18b80a4-9e20-46cd-854e-708ab2c11ed7';
    const CORRECT_EMAIL = 'surajss@gmail.com';

    try {
        await sequelize.authenticate();

        // 1. Find correct user
        const correctUser = await User.findOne({ where: { email: CORRECT_EMAIL } });
        if (!correctUser) {
            console.error(`User ${CORRECT_EMAIL} not found!`);
            return;
        }
        console.log(`Found correct user: ${correctUser.email} (ID: ${correctUser.id})`);

        // 2. Find PF Account with wrong ID
        const pfAccount = await Account.findOne({
            where: {
                type: 'pf',
                UserId: WRONG_ID
            }
        });

        if (!pfAccount) {
            console.log('No PF account found with the wrong User ID. It might have been fixed already.');
        } else {
            console.log(`Found PF Account: ${pfAccount.name} with wrong ID. Updating...`);

            // Update Account
            pfAccount.UserId = correctUser.id;
            await pfAccount.save();
            console.log('Updated Account UserId.');

            // Update Transactions
            const [txUpdated] = await Transaction.update(
                { UserId: correctUser.id },
                { where: { AccountId: pfAccount.id } }
            );
            console.log(`Updated ${txUpdated} Transactions.`);

            // Update CashflowTransactions
            const [cfUpdated] = await CashflowTransaction.update(
                { UserId: correctUser.id },
                { where: { AccountId: pfAccount.id } }
            );
            console.log(`Updated ${cfUpdated} CashflowTransactions.`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

fixUserId();
