const { sequelize } = require('./models');

async function sync() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // This will update the ENUM types in the database
        await sequelize.sync({ alter: true });
        console.log('Database synced successfully (alter: true).');

    } catch (err) {
        console.error('Error during sync:', err);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

sync();
