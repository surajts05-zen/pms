const express = require('express');
const router = express.Router();
const { CashflowTransaction, CashflowCategory, Account } = require('../models');
const { Op } = require('sequelize');

// Get all cashflow transactions with filters, sorting
router.get('/', async (req, res) => {
    try {
        const {
            accountId, categoryId, startDate, endDate, type,
            description, minAmount, maxAmount,
            sortField = 'transactionDate', sortOrder = 'DESC'
        } = req.query;

        let where = {};
        if (accountId && accountId !== 'all') where.AccountId = accountId;
        if (categoryId) where.CashflowCategoryId = categoryId;
        if (type) where.type = type;

        if (startDate || endDate) {
            where.transactionDate = {};
            if (startDate) where.transactionDate[Op.gte] = startDate;
            if (endDate) where.transactionDate[Op.lte] = endDate;
        }

        if (description) {
            where.description = { [Op.iLike]: `%${description}%` };
        }

        if (minAmount || maxAmount) {
            where.amount = {};
            if (minAmount) where.amount[Op.gte] = minAmount;
            if (maxAmount) where.amount[Op.lte] = maxAmount;
        }

        // Handle specific column filters from frontend Advanced Filter row
        Object.keys(req.query).forEach(key => {
            if (key.startsWith('filter_')) {
                const field = key.replace('filter_', '');
                const value = req.query[key].trim();
                if (!value) return;

                if (field === 'Account.name') {
                    where['$Account.name$'] = { [Op.iLike]: `%${value}%` };
                } else if (field === 'CashflowCategory.name') {
                    where['$CashflowCategory.name$'] = { [Op.iLike]: `%${value}%` };
                } else if (['description', 'type', 'transactionDate'].includes(field)) {
                    where[field] = { [Op.iLike]: `%${value}%` };
                }
            }
        });

        // Determine order clause
        let orderClause;
        if (sortField === 'Account.name') {
            orderClause = [{ model: Account }, 'name', sortOrder];
        } else if (sortField === 'CashflowCategory.name') {
            orderClause = [{ model: CashflowCategory }, 'name', sortOrder];
        } else {
            orderClause = [sortField, sortOrder];
        }

        const transactions = await CashflowTransaction.findAll({
            where,
            include: [
                { model: Account },
                { model: CashflowCategory }
            ],
            order: [orderClause]
        });

        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get ledger for specific account
router.get('/ledger/:accountId', async (req, res) => {
    try {
        const { accountId } = req.params;
        const { startDate, endDate } = req.query;

        const account = await Account.findByPk(accountId);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }

        // 1. Calculate the balance at the START of the requested period
        // Balance = Account.openingBalance + sum(debit - credit) for all transactions 
        // between Account.openingBalanceDate and startDate (exclusive)
        let periodOpeningBalance = parseFloat(account.openingBalance || 0);

        if (startDate) {
            const priorTransactions = await CashflowTransaction.findAll({
                where: {
                    AccountId: accountId,
                    transactionDate: {
                        [Op.lt]: startDate
                    }
                }
            });

            priorTransactions.forEach(t => {
                periodOpeningBalance += (parseFloat(t.credit || 0) - parseFloat(t.debit || 0));
            });
        }

        // 2. Fetch transactions for the requested period
        let where = { AccountId: accountId };
        if (startDate || endDate) {
            where.transactionDate = {};
            if (startDate) where.transactionDate[Op.gte] = startDate;
            if (endDate) where.transactionDate[Op.lte] = endDate;
        }

        const transactions = await CashflowTransaction.findAll({
            where,
            include: [CashflowCategory],
            order: [['transactionDate', 'ASC'], ['createdAt', 'ASC']]
        });

        // 3. Calculate running balance for the period starting from periodOpeningBalance
        let runningBalance = periodOpeningBalance;
        const ledger = transactions.map(t => {
            const debit = parseFloat(t.debit || 0);
            const credit = parseFloat(t.credit || 0);
            runningBalance += (credit - debit);

            return {
                ...t.toJSON(),
                runningBalance
            };
        });

        res.json({
            accountOpeningBalance: account.openingBalance,
            accountOpeningBalanceDate: account.openingBalanceDate,
            periodOpeningBalance,
            closingBalance: runningBalance,
            ledger
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get summary for a date range
router.get('/summary', async (req, res) => {
    try {
        let { accountId, startDate, endDate, year, month } = req.query;

        // Fallback to month/year if explicit dates not provided
        if (!startDate || !endDate) {
            const y = year || new Date().getFullYear();
            const m = month || (new Date().getMonth() + 1);
            startDate = `${y}-${String(m).padStart(2, '0')}-01`;
            const lastDay = new Date(y, m, 0).getDate();
            endDate = `${y}-${String(m).padStart(2, '0')}-${lastDay}`;
        }

        let where = {
            transactionDate: {
                [Op.gte]: startDate,
                [Op.lte]: endDate
            }
        };

        if (accountId && accountId !== 'all') {
            where.AccountId = accountId;
        }

        const transactions = await CashflowTransaction.findAll({
            where,
            include: [CashflowCategory, Account]
        });

        // Calculate summary
        let totalIncome = 0;
        let totalExpense = 0;
        const incomeByCategory = {};
        const expenseByCategory = {};

        transactions.forEach(t => {
            const debit = parseFloat(t.debit || 0);
            const credit = parseFloat(t.credit || 0);
            const categoryName = t.CashflowCategory?.name || 'Uncategorized';

            // Use debit/credit for income/expense based on type
            // Cr = In (Income), Dr = Out (Expense)
            if (t.type === 'income') {
                totalIncome += credit;
                incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + credit;
            } else if (t.type === 'expense') {
                totalExpense += debit;
                expenseByCategory[categoryName] = (expenseByCategory[categoryName] || 0) + debit;
            }
        });

        res.json({
            totalIncome,
            totalExpense,
            netCashflow: totalIncome - totalExpense,
            incomeByCategory,
            expenseByCategory,
            transactionCount: transactions.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create transfer between accounts
router.post('/transfer', async (req, res) => {
    try {
        const { fromAccountId, toAccountId, amount, transactionDate, description } = req.body;

        if (!fromAccountId || !toAccountId || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        if (fromAccountId === toAccountId) {
            return res.status(400).json({ error: 'Cannot transfer to the same account' });
        }

        // Create credit transaction (from account)
        const debitTxn = await CashflowTransaction.create({
            AccountId: fromAccountId,
            amount: parseFloat(amount),
            debit: parseFloat(amount),
            credit: 0,
            transactionDate,
            description: description || `Transfer to account`,
            type: 'transfer_out',
            transferAccountId: toAccountId,
            CashflowCategoryId: null
        });

        // Create credit transaction (to account)
        const creditTxn = await CashflowTransaction.create({
            AccountId: toAccountId,
            amount: parseFloat(amount),
            debit: 0,
            credit: parseFloat(amount),
            transactionDate,
            description: description || `Transfer from account`,
            type: 'transfer_in',
            transferAccountId: fromAccountId,
            linkedTransactionId: debitTxn.id,
            CashflowCategoryId: null
        });

        // Link the debit transaction to credit
        await debitTxn.update({ linkedTransactionId: creditTxn.id });

        // Fetch complete transactions with account info
        const debit = await CashflowTransaction.findByPk(debitTxn.id, {
            include: [{ model: Account }]
        });
        const credit = await CashflowTransaction.findByPk(creditTxn.id, {
            include: [{ model: Account }]
        });

        res.status(201).json({ debit, credit });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Create cashflow transaction
router.post('/', async (req, res) => {
    try {
        const { type, amount } = req.body;
        const val = parseFloat(amount);
        let debit = 0;
        let credit = 0;

        if (type === 'income' || type === 'transfer_in') {
            credit = val;
        } else if (type === 'expense' || type === 'transfer_out') {
            debit = val;
        }

        const transaction = await CashflowTransaction.create({
            ...req.body,
            debit,
            credit
        });
        const created = await CashflowTransaction.findByPk(transaction.id, {
            include: [Account, CashflowCategory]
        });
        res.status(201).json(created);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update cashflow transaction
router.put('/:id', async (req, res) => {
    try {
        await CashflowTransaction.update(req.body, { where: { id: req.params.id } });
        const updated = await CashflowTransaction.findByPk(req.params.id, {
            include: [Account, CashflowCategory]
        });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete cashflow transaction
router.delete('/:id', async (req, res) => {
    try {
        await CashflowTransaction.destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
