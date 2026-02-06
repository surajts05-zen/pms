const sequelize = require('./db');
async function listColumns() {
    try {
        const [results] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'LedgerPostings'");
        console.log('Columns in LedgerPostings:');
        console.log(results.map(r => r.column_name));

        const [journals] = await sequelize.query("SELECT * FROM \"JournalEntries\" LIMIT 1");
        console.log('\nSample Journal Entry Key names:');
        if (journals.length > 0) console.log(Object.keys(journals[0]));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}
listColumns();
