const sequelize = require('./db');
console.log('DB required');
sequelize.authenticate().then(() => {
    console.log('Auth ok');
    process.exit(0);
}).catch(err => {
    console.error('Auth failed', err);
    process.exit(1);
});
