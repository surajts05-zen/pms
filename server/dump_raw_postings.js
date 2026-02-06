const sequelize = require('./db');
async function dumpRaw() {
    try {
        const [rows] = await sequelize.query('SELECT * FROM "LedgerPostings" LIMIT 5');
        console.log('Raw rows from LedgerPostings:');
        rows.forEach(r => {
            console.log(JSON.stringify(r));
        });

        const [cols] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'LedgerPostings'");
        console.log('\nExact column names:', cols.map(c => c.column_name));

    } catch (err) {
        console.error('Dump failed:', err);
    } finally {
        process.exit();
    }
}
dumpRaw();
