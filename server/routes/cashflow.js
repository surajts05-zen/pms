const express = require('express');
const router = express.Router();
const { CashflowTransaction, CashflowCategory, Account } = require('../models');
const { Op } = require('sequelize');

// Get all cashflow transactions with filters
router.get('/', async (req, res) => {
    try {
        const { accountId, categoryId, startDate, endDate, type } = req.query;

        let where = {};
        if (accountId) where.AccountId = accountId;
        if (categoryId) where.CashflowCategoryId = categoryId;
        if (type) where.type = type;
        if (startDate || endDate) {
            where.transactionDate = {};
            if (startDate) where.transactionDate[Op.gte] = startDate;
            if (endDate) where.transactionDate[Op.lte] = endDate;
        }

        const transactions = await CashflowTransaction.findAll({
            where,
            include: [
                { model: Account },
                { model: CashflowCategory }
            ],
            order: [['transactionDate', 'DESC']]
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

        let where = { AccountId: accountId };
        if (startDate || endDate) {
            where.transactionDate = {};
            if (startDate) where.transactionDate[Op.gte] = startDate;
            if (endDate) where.transactionDate[Op.lte] = endDate;
        }

        const transactions = await CashflowTransaction.findAll({
            where,
            include: [CashflowCategory],
            order: [['transactionDate', 'ASC']]
        });

        // Calculate running balance
        let runningBalance = 0;
        const ledger = transactions.map(t => {
            const amount = parseFloat(t.amount);
            if (t.type === 'income') {
                runningBalance += amount;
            } else {
                runningBalance -= amount;
            }
            return {
                ...t.toJSON(),
                runningBalance
            };
        });

        res.json(ledger);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get monthly summary
router.get('/summary', async (req, res) => {
    try {
        const { accountId, year, month } = req.query;

        // Build date range for the month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

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
            const amount = parseFloat(t.amount);
            const categoryName = t.CashflowCategory?.name || 'Uncategorized';

            if (t.type === 'income') {
                totalIncome += amount;
                incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + amount;
            } else {
                totalExpense += amount;
                expenseByCategory[categoryName] = (expenseByCategory[categoryName] || 0) + amount;
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

// Create cashflow transaction
router.post('/', async (req, res) => {
    try {
        const transaction = await CashflowTransaction.create(req.body);
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
