const { Account, sequelize } = require('./models');
console.log('Models loaded');
sequelize.authenticate().then(() => {
    console.log('Auth ok');
    process.exit(0);
}).catch(err => {
    console.error('Auth failed', err);
    process.exit(1);
});
