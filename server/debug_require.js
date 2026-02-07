
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'debug_log.txt');

function log(msg) {
    fs.appendFileSync(logFile, msg + '\n');
}

try {
    fs.writeFileSync(logFile, 'Starting debug...\n');
    log('Checking models...');
    const { sequelize } = require('./models');
    log('models OK');

    const routes = [
        './routes/portfolio',
        './routes/auth',
        './routes/fixedDeposit',
        './routes/cashflow',
        './routes/categories',
        './routes/dividends',
        './routes/dashboard',
        './routes/accounting',
        './routes/financialStatements',
        './routes/interestRates',
        './routes/pf'
    ];

    for (const route of routes) {
        log(`Checking ${route}...`);
        require(route);
        log(`${route} OK`);
    }

    log('Checking Database Connection...');
    sequelize.authenticate().then(() => {
        log('Database Connection OK');
        log('Checking Database Sync...');
        return sequelize.sync({ alter: true });
    }).then(() => {
        log('Database Sync OK');
        process.exit(0);
    }).catch(err => {
        log('DATABASE ERROR: ' + err.message);
        log(err.stack);
        process.exit(1);
    });

} catch (err) {
    log('CRITICAL ERROR: ' + err.message);
    log(err.stack);
    process.exit(1);
}
