const XLSX = require('xlsx');
const path = require('path');
const { Account, CashflowTransaction, CashflowCategory, sequelize } = require('./models');
const { Op } = require('sequelize');

// Configuration
const EXCEL_FILE = '2025-26 Cash Flow Statement - Monthly.xlsx';
const START_MONTH_IDX = 1; // May 2025 (0 is April)
const END_MONTH_IDX = 10; // Feb 2026

const ACCOUNT_RENAME = {
    'Credit Card': 'ICICI CC'
};

const EXCLUDE_ACCOUNTS = ['Latha Credit Card'];

const ACCOUNT_TYPE_MAP = {
    'Kotak Salary': 'bank',
    'Kotak Spendz': 'bank',
    'ICICI': 'bank',
    'Kotak 811': 'bank',
    'ICICI CC': 'creditcard',
    'Cash': 'cash',
    'BoB': 'bank',
    'BOI': 'bank',
    'Amazon Pay ICICI CC': 'creditcard',
    'Kunica BoB Loan': 'loan',
    'IPPB': 'bank'
};

async function importMonths() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const excelPath = path.join(__dirname, '..', EXCEL_FILE);
        const workbook = XLSX.readFile(excelPath);

        const accountMap = {};
        const accounts = await Account.findAll();
        accounts.forEach(acc => accountMap[acc.name] = acc);

        for (let i = START_MONTH_IDX; i <= END_MONTH_IDX && i < workbook.SheetNames.length; i++) {
            const sheetName = workbook.SheetNames[i];
            console.log(`\n--- Processing Sheet: ${sheetName} ---`);

            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (!data || data.length < 3) continue;

            // 1. Determine Month Range for Cleanup
            // Sheet name format "May 2025"
            const parts = sheetName.split(' ');
            const monthName = parts[0];
            const yearNum = parseInt(parts[1]);
            const monthIdx = new Date(`${monthName} 1, ${yearNum}`).getMonth();
            const startDate = new Date(yearNum, monthIdx, 1);
            const endDate = new Date(yearNum, monthIdx + 1, 0);

            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            console.log(`Cleaning up transactions from ${startDateStr} to ${endDateStr}...`);
            await CashflowTransaction.destroy({
                where: {
                    transactionDate: {
                        [Op.between]: [startDateStr, endDateStr]
                    }
                }
            });

            // 2. Identify Accounts in this sheet
            const headerRow0 = data[0];
            const sheetAccounts = [];
            for (let c = 0; c < headerRow0.length; c += 5) {
                let name = headerRow0[c]?.toString().trim();
                if (!name) continue;
                if (ACCOUNT_RENAME[name]) name = ACCOUNT_RENAME[name];
                if (EXCLUDE_ACCOUNTS.includes(name)) continue;

                const dbAccount = accountMap[name];
                if (!dbAccount) {
                    console.log(`Warning: Account ${name} not found in DB. Skipping.`);
                    continue;
                }
                sheetAccounts.push({ name, startIndex: c, id: dbAccount.id });
            }
            console.log(`Found ${sheetAccounts.length} accounts in sheet.`);

            // 3. Process Transactions
            let monthCreated = 0;
            for (let r = 3; r < data.length; r++) {
                const row = data[r];
                if (!row || row.length === 0) continue;

                for (const accInfo of sheetAccounts) {
                    try {
                        const start = accInfo.startIndex;
                        const excelDate = row[start];
                        const particulars = row[start + 1];
                        const categoryName = row[start + 2]?.toString().trim() || 'Other Expenses';
                        const debit = parseFloat(row[start + 3]) || 0;
                        const credit = parseFloat(row[start + 4]) || 0;

                        if (!excelDate || (!debit && !credit)) continue;

                        let transactionDate;
                        if (typeof excelDate === 'number') {
                            const date = new Date((excelDate - 25569) * 86400 * 1000);
                            transactionDate = date.toISOString().split('T')[0];
                        } else continue;

                        let type, amount;
                        if (debit > 0) {
                            type = 'expense';
                            amount = debit;
                        } else if (credit > 0) {
                            type = 'income';
                            amount = credit;
                        }

                        if (!type) {
                            console.log(`Warning: No type for row ${r}, account ${accInfo.name}`);
                            continue;
                        }

                        if (categoryName === 'Transfers (Self)' || categoryName === 'Transfers (Others)') {
                            type = type === 'income' ? 'transfer_in' : 'transfer_out';
                        }

                        let categoryId = null;
                        if (!type.startsWith('transfer')) {
                            const catType = type === 'income' ? 'income' : 'expense';
                            let [category] = await CashflowCategory.findOrCreate({
                                where: { name: categoryName },
                                defaults: { type: catType }
                            });
                            categoryId = category.id;
                        }

                        await CashflowTransaction.create({
                            AccountId: accInfo.id,
                            amount,
                            debit,
                            credit,
                            transactionDate,
                            description: particulars,
                            type,
                            CashflowCategoryId: categoryId
                        });
                        monthCreated++;
                    } catch (err) {
                        console.error(`Error processing row ${r} for account ${accInfo.name}:`, err.message);
                    }
                }
            }
            console.log(`Imported ${monthCreated} transactions for ${sheetName}.`);
        }

        // 4. Link Transfers
        console.log('\n--- Linking Transfers ---');
        let linkedCount = 0;
        const allTransfers = await CashflowTransaction.findAll({
            where: {
                type: { [Op.in]: ['transfer_in', 'transfer_out'] },
                linkedTransactionId: null
            },
            order: [['transactionDate', 'ASC'], ['amount', 'ASC']]
        });

        for (let i = 0; i < allTransfers.length; i++) {
            const t1 = allTransfers[i];
            if (t1.linkedTransactionId) continue;

            for (let j = i + 1; j < allTransfers.length; j++) {
                const t2 = allTransfers[j];
                if (t2.linkedTransactionId) continue;

                if (t1.transactionDate === t2.transactionDate &&
                    Math.abs(t1.amount - t2.amount) < 0.01 &&
                    t1.type !== t2.type &&
                    t1.AccountId !== t2.AccountId) {

                    await t1.update({ linkedTransactionId: t2.id, transferAccountId: t2.AccountId });
                    await t2.update({ linkedTransactionId: t1.id, transferAccountId: t1.AccountId });
                    linkedCount++;
                    break;
                }
            }
        }
        console.log(`Linked ${linkedCount} pairs of transfers.`);
        console.log('\nImport process complete.');

    } catch (error) {
        console.error('Error during multi-month import:', error);
    } finally {
        await sequelize.close();
    }
}

importMonths();
