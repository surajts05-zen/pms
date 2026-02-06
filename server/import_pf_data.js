const fs = require('fs');
const { Account, Transaction, CashflowTransaction, sequelize } = require('./models');

async function importPFData() {
    const UserId = 'a18b80a4-9e20-46cd-854e-708ab2c11ed7';
    const data = JSON.parse(fs.readFileSync('../pf_data_all.json', 'utf8'));

    try {
        await sequelize.authenticate();
        const account = await Account.findOne({ where: { type: 'pf', UserId } });
        await sequelize.query('DELETE FROM "Transactions" WHERE "AccountId" = :aid', { replacements: { aid: account.id } });
        await sequelize.query('DELETE FROM "CashflowTransactions" WHERE "AccountId" = :aid', { replacements: { aid: account.id } });

        const importedSet = new Set();
        let totalImported = 0;

        for (const filename in data) {
            const tables = data[filename].data || [];
            for (const table of tables) {
                let eeCol = -1, erCol = -1, dateCol = -1;
                for (const row of table) {
                    if (row.some(c => c && c.includes('Wage Month'))) {
                        eeCol = row.findIndex(c => c && /EE\s*Share/i.test(c));
                        erCol = row.findIndex(c => c && /ER\s*Share/i.test(c));
                        dateCol = row.findIndex(c => c && /Transaction/i.test(c));
                        if (dateCol === -1) dateCol = row.findIndex(c => c && /Date/i.test(c));
                        break;
                    }
                }
                if (eeCol === -1) continue;

                for (const row of table) {
                    const dateStr = row[dateCol];
                    if (dateStr && /^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
                        console.log(`FILE: ${filename} | ROW: ${JSON.stringify(row)}`);
                        console.log(`  eeCol: ${eeCol} (${row[eeCol]}) | erCol: ${erCol} (${row[erCol]})`);
                        const total = parseFloat((row[eeCol] || '0').replace(/,/g, '')) + parseFloat((row[erCol] || '0').replace(/,/g, ''));
                        const key = `TX|${dateStr}|${total.toFixed(2)}`;
                        if (total > 0 && !importedSet.has(key)) {
                            importedSet.add(key);
                            totalImported += total;
                        }
                    }
                }
            }
        }
        console.log(`Final Sum: ${totalImported}`);
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
importPFData();
