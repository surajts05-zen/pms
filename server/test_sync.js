const { sequelize } = require('./models');

async function testSync() {
    try {
        await sequelize.sync({ alter: true });
        console.log('Sync successful');
    } catch (err) {
        console.error('Sync failed:');
        console.error(err);
    } finally {
        process.exit();
    }
}

testSync();
