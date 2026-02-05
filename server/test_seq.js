const { Sequelize } = require('sequelize');
console.log('Sequelize class loaded');
const s = new Sequelize('postgres://pms:123456@localhost:5432/pmsdb');
console.log('Sequelize instance created');
s.authenticate().then(() => {
    console.log('Authenticated');
    process.exit(0);
}).catch(err => {
    console.error('Failed', err);
    process.exit(1);
});
