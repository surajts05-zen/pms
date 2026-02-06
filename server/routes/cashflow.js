const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { authenticateToken } = require('./auth');
const { CashflowTransaction, CashflowCategory, Account } = require('../models');
const AccountingService = require('../accountingService');

// Get all cashflow transactions with filters, sorting
router.get('/', authenticateToken, async (req, res) => {
    try {
        const {
            accountId, categoryId, startDate, endDate, type,
            description, minAmount, maxAmount,
            sortField = 'transactionDate', sortOrder = 'DESC'
        } = req.query;

        let where = { UserId: req.user.id };
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
                { model: Account, where: { UserId: req.user.id } },
                { model: CashflowCategory, where: { UserId: req.user.id }, required: false }
            ],
            order: [orderClause]
        });

        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get ledger for specific account
router.get('/ledger/:accountId', authenticateToken, async (req, res) => {
    try {
        const { accountId } = req.params;
        const { startDate, endDate } = req.query;

        const account = await Account.findOne({
            where: { id: accountId, UserId: req.user.id }
        });
        if (!account) {
            return res.status(404).json({ error: 'Account not found or access denied' });
        }

        // 1. Calculate the balance at the START of the requested period
        // Balance = Account.openingBalance + sum(debit - credit) for all transactions 
        // between Account.openingBalanceDate and startDate (exclusive)
        let periodOpeningBalance = parseFloat(account.openingBalance || 0);

        if (startDate) {
            const priorTransactions = await CashflowTransaction.findAll({
                where: {
                    AccountId: accountId,
                    UserId: req.user.id,
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
        let where = { AccountId: accountId, UserId: req.user.id };
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
router.get('/summary', authenticateToken, async (req, res) => {
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
            UserId: req.user.id,
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

        // Calculate Period Opening Balance
        let openingBalance = 0;
        if (accountId && accountId !== 'all') {
            const account = await Account.findOne({
                where: { id: accountId, UserId: req.user.id }
            });
            if (account) {
                openingBalance = parseFloat(account.openingBalance || 0);
                const priorCredit = await CashflowTransaction.sum('credit', {
                    where: { AccountId: accountId, UserId: req.user.id, transactionDate: { [Op.lt]: startDate } }
                }) || 0;
                const priorDebit = await CashflowTransaction.sum('debit', {
                    where: { AccountId: accountId, UserId: req.user.id, transactionDate: { [Op.lt]: startDate } }
                }) || 0;
                openingBalance += (parseFloat(priorCredit) - parseFloat(priorDebit));
            }
        } else {
            // ALL Accounts - sum of opening balances + all prior transactions across all accounts
            const totalInitialOpening = await Account.sum('openingBalance', { where: { isArchived: false, UserId: req.user.id } }) || 0;
            const priorCredit = await CashflowTransaction.sum('credit', {
                where: { transactionDate: { [Op.lt]: startDate }, UserId: req.user.id },
                include: [{ model: Account, where: { isArchived: false, UserId: req.user.id } }]
            }) || 0;
            const priorDebit = await CashflowTransaction.sum('debit', {
                where: { transactionDate: { [Op.lt]: startDate }, UserId: req.user.id },
                include: [{ model: Account, where: { isArchived: false, UserId: req.user.id } }]
            }) || 0;
            openingBalance = parseFloat(totalInitialOpening) + (parseFloat(priorCredit) - parseFloat(priorDebit));
        }

        // Calculate summary and net change for closing balance
        let totalIncome = 0;
        let totalExpense = 0;
        let periodNetChange = 0;
        const incomeByCategory = {};
        const expenseByCategory = {};

        transactions.forEach(t => {
            const debit = parseFloat(t.debit || 0);
            const credit = parseFloat(t.credit || 0);
            const categoryName = t.CashflowCategory?.name || 'Uncategorized';

            periodNetChange += (credit - debit);

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
            transactionCount: transactions.length,
            openingBalance,
            closingBalance: openingBalance + periodNetChange
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create transfer between accounts
router.post('/transfer', authenticateToken, async (req, res) => {
    try {
        const { fromAccountId, toAccountId, amount, transactionDate, description } = req.body;

        if (!fromAccountId || !toAccountId || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify ownership of accounts
        const accounts = await Account.findAll({
            where: {
                id: { [Op.in]: [fromAccountId, toAccountId] },
                UserId: req.user.id
            }
        });

        if (accounts.length !== 2 && fromAccountId !== toAccountId) {
            return res.status(403).json({ error: 'One or both accounts not found or access denied' });
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
            CashflowCategoryId: null,
            UserId: req.user.id
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
            CashflowCategoryId: null,
            UserId: req.user.id
        });

        // Link the debit transaction to credit
        await debitTxn.update({ linkedTransactionId: creditTxn.id });

        // SYNC TO ACCOUNTING
        await AccountingService.processCashflowTransaction(debitTxn);
        await AccountingService.processCashflowTransaction(creditTxn);

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

// Helper to extract scrip from description
const extractScrip = (description) => {
    if (!description) return null;

    // Common patterns for dividend descriptions
    // 1. "ACH C- HDFCBANK DIVIDEND" -> HDFCBANK
    // 2. "CMS/ 345345/ HDFCBANK" -> HDFCBANK (often seen)
    // 3. "NEFT- ... - HDFCBANK" 

    let scrip = null;
    const cleanDesc = description.toUpperCase().replace(/[^A-Z0-9\s\/\-]/g, ' ');

    // Pattern 1: Word before "DIVIDEND" or "DIV"
    const divMatch = cleanDesc.match(/([A-Z0-9]+)\s+(?:DIVIDEND|DIV)\b/);
    if (divMatch) {
        scrip = divMatch[1];
    }
    // Pattern 2: Known heavy hitters check if pattern 1 fails
    else {
        const commonScrips = ['HDFCBANK', 'RELIANCE', 'ITC', 'TCS', 'INFY', 'SBIN', 'ICICIBANK', 'VEDL', 'POWERGRID', 'COALINDIA'];
        for (const s of commonScrips) {
            if (cleanDesc.includes(s)) {
                scrip = s;
                break;
            }
        }
    }

    // Clean up scrip name (remove common prefixes/suffixes if caught)
    if (scrip) {
        if (scrip.length < 3) return null; // Too short to be valid scrip usually
        if (['ACH', 'CMS', 'NEFT', 'RTGS', 'UPI'].includes(scrip)) return null;
    }

    return scrip;
};

// Create cashflow transaction
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { type, amount, description, CashflowCategoryId, AccountId } = req.body;
        const val = parseFloat(amount);
        let debit = 0;
        let credit = 0;
        let scrip = req.body.scrip;

        // Verify account ownership
        const account = await Account.findOne({ where: { id: AccountId, UserId: req.user.id } });
        if (!account) return res.status(403).json({ error: 'Account not found or access denied' });

        if (type === 'income' || type === 'transfer_in') {
            credit = val;
        } else if (type === 'expense' || type === 'transfer_out') {
            debit = val;
        }

        // Automatic Scrip Extraction
        if (!scrip && CashflowCategoryId) {
            const category = await CashflowCategory.findOne({ where: { id: CashflowCategoryId, UserId: req.user.id } });
            if (category && category.name === 'Dividend') {
                scrip = extractScrip(description);
            }
        }

        const transaction = await CashflowTransaction.create({
            ...req.body,
            debit,
            credit,
            scrip, // Save extracted scrip
            UserId: req.user.id
        });

        // SYNC TO ACCOUNTING
        await AccountingService.processCashflowTransaction(transaction);

        const created = await CashflowTransaction.findOne({
            where: { id: transaction.id, UserId: req.user.id },
            include: [Account, CashflowCategory]
        });
        res.status(201).json(created);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update cashflow transaction
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        let updateData = { ...req.body };

        // Automatic Scrip Extraction logic for updates
        if (updateData.CashflowCategoryId || updateData.description) {
            const transaction = await CashflowTransaction.findOne({
                where: { id: req.params.id, UserId: req.user.id }
            });
            if (transaction) {
                // Determine CategoryId (updated or existing)
                const catId = updateData.CashflowCategoryId || transaction.CashflowCategoryId;
                const desc = updateData.description || transaction.description;

                if (catId) {
                    const category = await CashflowCategory.findOne({ where: { id: catId, UserId: req.user.id } });
                    if (category && category.name === 'Dividend' && !updateData.scrip) {
                        const extracted = extractScrip(desc);
                        if (extracted) {
                            updateData.scrip = extracted;
                        }
                    }
                }
            }
        }

        await CashflowTransaction.update(updateData, {
            where: { id: req.params.id, UserId: req.user.id }
        });
        const updated = await CashflowTransaction.findOne({
            where: { id: req.params.id, UserId: req.user.id },
            include: [Account, CashflowCategory]
        });

        // SYNC TO ACCOUNTING (Delete old and re-create)
        const { JournalEntry } = require('../models');
        await JournalEntry.destroy({
            where: { referenceId: updated.id, referenceType: 'CashflowTransaction' }
        });
        await AccountingService.processCashflowTransaction(updated);

        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete cashflow transaction
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { JournalEntry } = require('../models');
        // Verify ownership
        const transaction = await CashflowTransaction.findOne({
            where: { id: req.params.id, UserId: req.user.id }
        });
        if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

        // Delete related journal entries first
        await JournalEntry.destroy({
            where: { referenceId: req.params.id, referenceType: 'CashflowTransaction', UserId: req.user.id }
        });

        await CashflowTransaction.destroy({ where: { id: req.params.id, UserId: req.user.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
