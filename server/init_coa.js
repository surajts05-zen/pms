const { LedgerAccount, Account, CashflowCategory, sequelize } = require('./models');

async function initCoA() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Sync to ensure new tables exist
        await sequelize.sync({ alter: true });
        console.log('Schema synchronized.');

        // 1. Create Base Categories
        const baseCategories = [
            { name: 'Assets', type: 'Asset' },
            { name: 'Liabilities', type: 'Liability' },
            { name: 'Equity', type: 'Equity' },
            { name: 'Revenue', type: 'Revenue' },
            { name: 'Expenses', type: 'Expense' }
        ];

        const baseAccounts = {};
        for (const cat of baseCategories) {
            const [acc] = await LedgerAccount.findOrCreate({
                where: { name: cat.name, type: cat.type },
                defaults: { subType: 'Root' }
            });
            baseAccounts[cat.name] = acc;
        }

        // 2. Map existing Accounts (Bank, Demat, etc.) as sub-accounts of Assets/Liabilities
        const accounts = await Account.findAll();
        for (const acc of accounts) {
            let parentAcc;
            let subType = acc.type;

            if (['bank', 'pf', 'cash'].includes(acc.type)) {
                parentAcc = baseAccounts['Assets'];
            } else if (acc.type === 'demat') {
                parentAcc = baseAccounts['Assets'];
                subType = 'Investment';
            } else if (acc.type === 'creditcard' || acc.type === 'loan') {
                parentAcc = baseAccounts['Liabilities'];
            }

            if (parentAcc) {
                await LedgerAccount.findOrCreate({
                    where: { linkedId: acc.id, linkedType: 'Account' },
                    defaults: {
                        name: acc.name,
                        type: parentAcc.type,
                        subType: subType,
                        parentId: parentAcc.id,
                        linkedId: acc.id,
                        linkedType: 'Account'
                    }
                });
            }
        }

        // 3. Map existing CashflowCategories as sub-accounts of Revenue/Expenses
        const categories = await CashflowCategory.findAll();
        for (const cat of categories) {
            let parentAcc;
            if (cat.isInvestment) {
                // If it's an investment, it maps to Assets (e.g. "Investment in Stocks")
                // We'll put it under strict 'Assets' -> 'Investments' if we had that structure,
                // but for now 'Assets' is fine.
                parentAcc = baseAccounts['Assets'];
            } else {
                parentAcc = cat.type === 'income' ? baseAccounts['Revenue'] : baseAccounts['Expenses'];
            }

            await LedgerAccount.findOrCreate({
                where: { linkedId: cat.id, linkedType: 'CashflowCategory' },
                defaults: {
                    name: cat.name,
                    type: parentAcc.type,
                    subType: cat.parentCategory || 'General',
                    parentId: parentAcc.id,
                    linkedId: cat.id,
                    linkedType: 'CashflowCategory'
                }
            });
        }

        // 4. Create standard Equity accounts
        await LedgerAccount.findOrCreate({
            where: { name: 'Owner Equity', type: 'Equity' },
            defaults: {
                subType: 'Capital',
                parentId: baseAccounts['Equity'].id
            }
        });

        await LedgerAccount.findOrCreate({
            where: { name: 'Opening Balance Equity', type: 'Equity' },
            defaults: {
                subType: 'OpeningBalance',
                parentId: baseAccounts['Equity'].id
            }
        });

        // 5. Create FD/RD Asset Accounts
        await LedgerAccount.findOrCreate({
            where: { name: 'Fixed Deposits - Short Term', type: 'Asset' },
            defaults: {
                subType: 'Current Asset',
                parentId: baseAccounts['Assets'].id
            }
        });

        await LedgerAccount.findOrCreate({
            where: { name: 'Fixed Deposits - Long Term', type: 'Asset' },
            defaults: {
                subType: 'Non-Current Asset',
                parentId: baseAccounts['Assets'].id
            }
        });

        await LedgerAccount.findOrCreate({
            where: { name: 'Recurring Deposits', type: 'Asset' },
            defaults: {
                subType: 'Current Asset',
                parentId: baseAccounts['Assets'].id
            }
        });

        await LedgerAccount.findOrCreate({
            where: { name: 'TDS Receivable', type: 'Asset' },
            defaults: {
                subType: 'Current Asset',
                parentId: baseAccounts['Assets'].id
            }
        });

        // 6. Create FD/RD Income Accounts
        await LedgerAccount.findOrCreate({
            where: { name: 'FD Interest Income', type: 'Revenue' },
            defaults: {
                subType: 'Other Income',
                parentId: baseAccounts['Revenue'].id
            }
        });

        await LedgerAccount.findOrCreate({
            where: { name: 'RD Interest Income', type: 'Revenue' },
            defaults: {
                subType: 'Other Income',
                parentId: baseAccounts['Revenue'].id
            }
        });

        console.log('Chart of Accounts initialized successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error initializing CoA:', error);
        process.exit(1);
    }
}

initCoA();
