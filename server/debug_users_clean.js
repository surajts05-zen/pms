const { User, Account, sequelize } = require('./models');

async function check() {
    try {
        await sequelize.authenticate();

        const users = await User.findAll();
        console.log("USERS FOUND: " + users.length);
        users.forEach(u => console.log(`USER: ${u.email} | ID: ${u.id}`));

        const accounts = await Account.findAll({ where: { type: 'pf' } });
        console.log("PF ACCOUNTS: " + accounts.length);
        accounts.forEach(a => console.log(`PF ACC: ${a.name} | Linked UserID: ${a.UserId}`));

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
check();
