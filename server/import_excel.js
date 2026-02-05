const XLSX = require('xlsx');
const path = require('path');
const { Account, CashflowTransaction, CashflowCategory, sequelize } = require('./models');
const { Op } = require('sequelize');

// Configuration
const EXCEL_FILE = '2025-26 Cash Flow Statement - Monthly.xlsx';
const IMPORT_SHEET = 'Apr 2025';

// Account Mapping & Exclusion
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

async function importData() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const excelPath = path.join(__dirname, '..', EXCEL_FILE);
        const workbook = XLSX.readFile(excelPath);

        // 1. Identify ALL accounts from first 12 sheets
        const allAccountNames = new Set();
        for (let i = 0; i < 12 && i < workbook.SheetNames.length; i++) {
            const sheetName = workbook.SheetNames[i];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            const row0 = data[0] || [];
            for (let c = 0; c < row0.length; c += 5) {
                let name = row0[c]?.toString().trim();
                if (name) allAccountNames.add(name);
            }
        }

        console.log('\nCreating/Updating all identified accounts...');
        for (let name of allAccountNames) {
            let originalName = name;
            if (ACCOUNT_RENAME[name]) name = ACCOUNT_RENAME[name];
            if (EXCLUDE_ACCOUNTS.includes(name)) continue;

            const type = ACCOUNT_TYPE_MAP[name] || 'bank';
            let [account, created] = await Account.findOrCreate({
                where: { name: name },
                defaults: {
                    type: type,
                    institution: name.split(' ')[0],
                    balance: 0
                }
            });
            if (created) console.log(`Created account: ${name}`);
            else console.log(`Verified account: ${name}`);
        }

        // 2. Process April 2025 Data
        console.log(`\nImporting data from sheet: ${IMPORT_SHEET}`);
        const sheet = workbook.Sheets[IMPORT_SHEET];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        // Cleanup existing April 2025 transactions
        console.log('Cleaning up existing April 2025 transactions...');
        await CashflowTransaction.destroy({
            where: {
                transactionDate: {
                    [Op.between]: ['2025-04-01', '2025-04-30']
                }
            }
        });

        const headerRow0 = data[0];
        const aprilAccounts = []; // { name, startIndex, type }

        for (let c = 0; c < headerRow0.length; c += 5) {
            let name = headerRow0[c]?.toString().trim();
            if (!name) continue;
            if (ACCOUNT_RENAME[name]) name = ACCOUNT_RENAME[name];
            if (EXCLUDE_ACCOUNTS.includes(name)) continue;

            const type = ACCOUNT_TYPE_MAP[name] || 'bank';
            aprilAccounts.push({ name, startIndex: c, type });
        }

        const accountMap = {};
        const dbAccounts = await Account.findAll();
        dbAccounts.forEach(acc => accountMap[acc.name] = acc);

        let totalCreated = 0;

        // 3. Process Opening Balances (Row 2)
        console.log('\nImporting Opening Balances...');
        const row2 = data[2];
        for (const accInfo of aprilAccounts) {
            const start = accInfo.startIndex;
            const dbAccount = accountMap[accInfo.name];
            const drValue = parseFloat(row2[start + 3]) || 0;
            const crValue = parseFloat(row2[start + 4]) || 0;

            let amount = crValue - drValue;
            if (amount !== 0) {
                let type = amount >= 0 ? 'income' : 'expense';
                await CashflowTransaction.create({
                    AccountId: dbAccount.id,
                    amount: Math.abs(amount),
                    transactionDate: '2025-04-01',
                    description: 'Opening Balance',
                    type: type,
                    CashflowCategoryId: null
                });
                totalCreated++;
            }
        }

        // 4. Process Transactions (Rows 3+)
        console.log('Parsing transactions...');
        for (let r = 3; r < data.length; r++) {
            const row = data[r];
            if (!row || row.length === 0) continue;

            for (const accInfo of aprilAccounts) {
                const start = accInfo.startIndex;
                const dbAccount = accountMap[accInfo.name];

                const excelDate = row[start];
                const particulars = row[start + 1];
                const categoryName = row[start + 2];
                const debit = parseFloat(row[start + 3]) || 0;
                const credit = parseFloat(row[start + 4]) || 0;

                if (!excelDate || (!debit && !credit)) continue;

                let transactionDate;
                if (typeof excelDate === 'number') {
                    const date = new Date((excelDate - 25569) * 86400 * 1000);
                    transactionDate = date.toISOString().split('T')[0];
                } else continue;

                let type, amount, finalCategoryName = categoryName || 'Other Expenses';
                if (debit > 0) {
                    type = 'expense';
                    amount = debit;
                } else if (credit > 0) {
                    type = 'income';
                    amount = credit;
                }

                if (categoryName === 'Transfers (Self)' || categoryName === 'Transfers (Others)') {
                    type = type === 'income' ? 'transfer_in' : 'transfer_out';
                }

                let categoryId = null;
                if (type !== 'transfer') {
                    const catType = type === 'income' ? 'income' : 'expense';
                    let [category] = await CashflowCategory.findOrCreate({
                        where: { name: finalCategoryName },
                        defaults: { type: catType }
                    });
                    categoryId = category.id;
                }

                await CashflowTransaction.create({
                    AccountId: dbAccount.id,
                    amount,
                    transactionDate,
                    description: particulars,
                    type,
                    CashflowCategoryId: categoryId
                });
                totalCreated++;
            }
        }

        console.log(`\nImport complete! Total Created: ${totalCreated} transactions.`);

    } catch (error) {
        console.error('Error during import:', error);
    } finally {
        await sequelize.close();
    }
}

importData();
