const { User, Account, sequelize } = require('./models');

async function checkUsersAndAccounts() {
    try {
        await sequelize.authenticate();

        console.log("--- USERS ---");
        const users = await User.findAll();
        users.forEach(u => {
            console.log(`ID: ${u.id}, Email: ${u.email}, Name: ${u.name || 'N/A'}`);
        });

        console.log("\n--- PF ACCOUNTS ---");
        const pfAccounts = await Account.findAll({ where: { type: 'pf' } });
        pfAccounts.forEach(a => {
            console.log(`AccountID: ${a.id}, Name: ${a.name}, UserID: ${a.UserId}, Balance: ${a.balance}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
checkUsersAndAccounts();
