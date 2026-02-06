const { Account, FixedDeposit, User } = require('./models');
const { Op } = require('sequelize');

async function verifyDashboard() {
    try {
        const user = await User.findOne({ where: { email: 'surajss@gmail.com' } });
        if (!user) {
            console.log('User not found');
            return;
        }
        const userId = user.id;

        const bankBalance = await Account.sum('balance', {
            where: { type: { [Op.in]: ['bank', 'cash'] }, UserId: userId }
        });
        const fdTotal = await FixedDeposit.sum('principalAmount', {
            where: { status: 'ACTIVE', UserId: userId }
        });

        console.log('Verification Results:');
        console.log('Bank Balance:', bankBalance);
        console.log('FD Total:', fdTotal);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

verifyDashboard();
