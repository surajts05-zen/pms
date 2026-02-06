const sequelize = require('./db');

async function debug() {
    try {
        console.log('--- TABLE SCHEMA ---');
        const [results] = await sequelize.query("SELECT * FROM information_schema.columns WHERE table_name = 'LedgerPostings'");
        results.forEach(r => console.log(`${r.column_name} (${r.data_type})`));

        console.log('\n--- SAMPLE DATA (10 ROWS) ---');
        const [rows] = await sequelize.query('SELECT * FROM "LedgerPostings" LIMIT 10');
        rows.forEach((r, i) => {
            console.log(`Row ${i + 1}:`, r);
        });

        console.log('\n--- COLUMN-SPECIFIC COUNTS ---');
        const [[{ count: total }]] = await sequelize.query('SELECT count(*) FROM "LedgerPostings"');
        console.log(`Total rows: ${total}`);

        for (let col of results.map(r => r.column_name)) {
            if (['id', 'debit', 'credit', 'createdAt', 'updatedAt'].includes(col)) continue;
            const [[{ count: nonNull }]] = await sequelize.query(`SELECT count(*) FROM "LedgerPostings" WHERE "${col}" IS NOT NULL`);
            console.log(`Column "${col}" has ${nonNull} non-null values.`);
        }

    } catch (err) {
        console.error('Debug failed:', err);
    } finally {
        process.exit();
    }
}
debug();
