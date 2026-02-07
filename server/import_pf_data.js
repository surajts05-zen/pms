const fs = require('fs');
const { Account, Transaction, CashflowTransaction, sequelize } = require('./models');

async function importPFData() {
    const UserId = 'a18b80a4-9e20-46cd-854e-708ab2c11ed7';
    const data = JSON.parse(fs.readFileSync('../pf_data_all.json', 'utf8'));

    function parseAmt(val) {
        if (!val) return 0;
        const firstLine = val.split('\n')[0];
        const num = parseFloat(firstLine.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 0 : num;
    }

    try {
        await sequelize.authenticate();
        const account = await Account.findOne({ where: { type: 'pf', UserId } });
        await sequelize.query('DELETE FROM "Transactions" WHERE "AccountId" = :aid', { replacements: { aid: account.id } });
        await sequelize.query('DELETE FROM "CashflowTransactions" WHERE "AccountId" = :aid', { replacements: { aid: account.id } });

        const importedSet = new Set();
        let logSum = 0;

        for (const filename in data) {
            console.log(`Processing ${filename}`);
            const tables = data[filename].data || [];
            for (const table of tables) {
                for (const row of table) {
                    const di = row.findIndex(c => c && /^\d{2}-\d{2}-\d{4}$/.test(c));

                    if (di !== -1) {
                        const dateStr = row[di];
                        let ee = 0, er = 0;

                        // Check if row[di+1] is Particulars (Style A) or Wages (Style B)
                        const nextCell = (row[di + 1] || '').toString();
                        const isStyleA = /[a-zA-Z]/.test(nextCell);

                        if (isStyleA) {
                            ee = parseAmt(row[di + 4]);
                            er = parseAmt(row[di + 5]) + parseAmt(row[di + 6]);
                        } else {
                            ee = parseAmt(row[di + 3]);
                            er = parseAmt(row[di + 4]);
                        }

                        const total = ee + er;
                        if (total > 0 && total < 45000) {
                            const key = `TX|${dateStr}|${total.toFixed(2)}`;
                            if (!importedSet.has(key)) {
                                const dateParts = dateStr.split('-');
                                const isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                                await Transaction.create({ AccountId: account.id, type: 'deposit', transactionDate: isoDate, quantity: total, price: 1, notes: isStyleA ? row[di + 1] : 'Contribution', UserId });
                                await CashflowTransaction.create({ AccountId: account.id, amount: total, credit: total, transactionDate: isoDate, description: isStyleA ? row[di + 1] : 'Contribution', type: 'income', UserId });
                                importedSet.add(key);
                                logSum += total;
                            }
                        }
                    }

                    // Interest
                    if (JSON.stringify(row).toLowerCase().includes('int. updated upto')) {
                        const cell = row.find(c => c && c.toLowerCase().includes('int. updated upto'));
                        const dateMatch = cell.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                        if (dateMatch) {
                            const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
                            // Interest rows are almost always Style A mapping in New, Style B in Old
                            let eeInt = parseAmt(row[row.length - 4]) || parseAmt(row[row.length - 3]);
                            let erInt = (parseAmt(row[row.length - 3]) + parseAmt(row[row.length - 2])) || parseAmt(row[row.length - 2]);

                            const totalInterest = eeInt + erInt;
                            const key = `INT|${date}|${totalInterest.toFixed(2)}`;
                            if (totalInterest > 5000 && totalInterest < 500000 && !importedSet.has(key)) {
                                await Transaction.create({ AccountId: account.id, type: 'deposit', transactionDate: date, quantity: totalInterest, price: 1, notes: 'Annual Interest Credited', UserId });
                                await CashflowTransaction.create({ AccountId: account.id, amount: totalInterest, credit: totalInterest, transactionDate: date, description: 'Annual Interest Credited', type: 'income', UserId });
                                importedSet.add(key);
                                logSum += totalInterest;
                            }
                        }
                    }
                }
            }
        }

        account.balance = logSum;
        await account.save();
        console.log(`IMPORT COMPLETE. Balance: ${account.balance}`);
        console.log(`Unique items: ${importedSet.size}`);
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}
importPFData();
