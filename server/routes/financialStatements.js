const express = require('express');
const router = express.Router();
const { LedgerAccount, JournalEntry, LedgerPosting, sequelize } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('./auth');

// Fetch Profit & Loss Data
router.get('/profit-loss', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        // Default to current financial year
        const start = startDate || '2025-04-01';
        const end = endDate || '2026-03-31';

        const results = await LedgerPosting.findAll({
            attributes: [
                [sequelize.fn('TO_CHAR', sequelize.col('JournalEntry.transactionDate'), 'YYYY-MM'), 'month'],
                [sequelize.col('LedgerAccount.name'), 'categoryName'],
                [sequelize.col('LedgerAccount.type'), 'accountType'],
                [sequelize.col('LedgerAccount.subType'), 'subType'],
                [
                    sequelize.literal(`SUM(CASE WHEN "LedgerAccount"."type" = 'Expense' THEN "LedgerPosting"."debit" - "LedgerPosting"."credit" ELSE "LedgerPosting"."credit" - "LedgerPosting"."debit" END)`),
                    'balance'
                ]
            ],
            where: { UserId: req.user.id },
            include: [
                {
                    model: JournalEntry,
                    attributes: [],
                    where: {
                        transactionDate: {
                            [Op.between]: [start, end]
                        },
                        UserId: req.user.id
                    }
                },
                {
                    model: LedgerAccount,
                    attributes: [],
                    where: {
                        type: { [Op.in]: ['Revenue', 'Expense'] },
                        UserId: req.user.id
                    }
                }
            ],
            group: [
                sequelize.fn('TO_CHAR', sequelize.col('JournalEntry.transactionDate'), 'YYYY-MM'),
                'LedgerAccount.name',
                'LedgerAccount.type',
                'LedgerAccount.subType'
            ],
            raw: true
        });

        res.json(results);
    } catch (err) {
        console.error('Income Statement Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Fetch Balance Sheet Data
router.get('/balance-sheet', authenticateToken, async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        const results = await LedgerAccount.findAll({
            attributes: [
                'id', 'name', 'type', 'subType',
                [sequelize.fn('SUM', sequelize.col('LedgerPostings.debit')), 'totalDebit'],
                [sequelize.fn('SUM', sequelize.col('LedgerPostings.credit')), 'totalCredit']
            ],
            include: [{
                model: LedgerPosting,
                attributes: [],
                where: { UserId: req.user.id },
                include: [{
                    model: JournalEntry,
                    attributes: [],
                    where: {
                        transactionDate: { [Op.lte]: targetDate },
                        UserId: req.user.id
                    }
                }]
            }],
            where: {
                type: { [Op.in]: ['Asset', 'Liability', 'Equity'] },
                UserId: req.user.id
            },
            group: ['LedgerAccount.id', 'LedgerAccount.name', 'LedgerAccount.type', 'LedgerAccount.subType'],
            raw: true
        });

        // Calculate actual balances based on type
        const balances = results.map(acc => {
            const dr = parseFloat(acc.totalDebit || 0);
            const cr = parseFloat(acc.totalCredit || 0);
            let balance = 0;
            // Assets: Normal debit balance
            // Liabilities/Equity: Normal credit balance
            if (acc.type === 'Asset') {
                balance = dr - cr;
            } else {
                balance = cr - dr;
            }
            return {
                id: acc.id,
                name: acc.name,
                type: acc.type,
                subType: acc.subType,
                balance
            };
        });

        res.json(balances);
    } catch (err) {
        console.error('Balance Sheet Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Fetch Annual Cashflow Statement Data
router.get('/annual-cashflow', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { CashflowTransaction, CashflowCategory, Account } = require('../models');

        // Default to current financial year
        const start = startDate || '2025-04-01';
        const end = endDate || '2026-03-31';

        // Get all transactions with category info
        const transactions = await CashflowTransaction.findAll({
            attributes: [
                'id', 'amount', 'debit', 'credit', 'transactionDate', 'type'
            ],
            where: {
                UserId: req.user.id,
                transactionDate: {
                    [Op.between]: [start, end]
                }
            },
            include: [
                {
                    model: CashflowCategory,
                    attributes: ['id', 'name', 'type', 'isInvestment', 'parentCategory']
                },
                {
                    model: Account,
                    attributes: ['id', 'name', 'type']
                }
            ],
            raw: true,
            nest: true
        });

        // Build monthly data grouped by category
        const monthlyData = {};
        const categoryTotals = {};
        const allMonths = new Set();

        transactions.forEach(txn => {
            const month = txn.transactionDate.substring(0, 7); // YYYY-MM
            allMonths.add(month);

            const categoryName = txn.CashflowCategory?.name || 'Uncategorized';
            const categoryType = txn.CashflowCategory?.type || 'expense';
            const isInvestment = txn.CashflowCategory?.isInvestment || false;
            const parentCategory = txn.CashflowCategory?.parentCategory || '';

            // Determine the section for this category
            let section = 'operating'; // Default
            if (isInvestment) {
                section = 'investing';
            } else if (parentCategory?.toLowerCase().includes('loan') ||
                parentCategory?.toLowerCase().includes('financing') ||
                categoryName.toLowerCase().includes('emi') ||
                categoryName.toLowerCase().includes('loan')) {
                section = 'financing';
            }

            // Calculate flow amount (positive = inflow, negative = outflow)
            let flowAmount = 0;
            if (categoryType === 'income') {
                flowAmount = parseFloat(txn.credit || txn.amount || 0);
            } else {
                flowAmount = -parseFloat(txn.debit || txn.amount || 0);
            }

            const key = `${section}|${categoryName}`;
            if (!monthlyData[key]) {
                monthlyData[key] = {
                    section,
                    categoryName,
                    categoryType,
                    isInvestment,
                    monthly: {}
                };
            }

            if (!monthlyData[key].monthly[month]) {
                monthlyData[key].monthly[month] = 0;
            }
            monthlyData[key].monthly[month] += flowAmount;

            // Track category totals
            if (!categoryTotals[key]) {
                categoryTotals[key] = 0;
            }
            categoryTotals[key] += flowAmount;
        });

        // Sort months
        const sortedMonths = Array.from(allMonths).sort();

        // Calculate section totals
        const sectionTotals = {
            operating: { monthly: {}, total: 0 },
            investing: { monthly: {}, total: 0 },
            financing: { monthly: {}, total: 0 }
        };

        sortedMonths.forEach(month => {
            sectionTotals.operating.monthly[month] = 0;
            sectionTotals.investing.monthly[month] = 0;
            sectionTotals.financing.monthly[month] = 0;
        });

        Object.values(monthlyData).forEach(data => {
            const section = data.section;
            Object.entries(data.monthly).forEach(([month, amount]) => {
                sectionTotals[section].monthly[month] += amount;
                sectionTotals[section].total += amount;
            });
        });

        // Calculate Free Cash Flow (Operating - investing outflows that are CapEx)
        // For simplicity: FCF = Operating Cash Flow - Investing Outflows
        const freeCashFlow = {
            monthly: {},
            total: 0
        };

        sortedMonths.forEach(month => {
            const opCash = sectionTotals.operating.monthly[month] || 0;
            const invOutflow = Math.min(sectionTotals.investing.monthly[month] || 0, 0); // Only outflows (negative)
            freeCashFlow.monthly[month] = opCash + invOutflow; // Subtracting outflows (negative values)
        });
        freeCashFlow.total = sectionTotals.operating.total + Math.min(sectionTotals.investing.total, 0);

        // Net cash change
        const netCashChange = {
            monthly: {},
            total: 0
        };

        sortedMonths.forEach(month => {
            netCashChange.monthly[month] =
                (sectionTotals.operating.monthly[month] || 0) +
                (sectionTotals.investing.monthly[month] || 0) +
                (sectionTotals.financing.monthly[month] || 0);
        });
        netCashChange.total = sectionTotals.operating.total + sectionTotals.investing.total + sectionTotals.financing.total;

        // Format response
        const response = {
            months: sortedMonths,
            categories: Object.values(monthlyData),
            sectionTotals,
            freeCashFlow,
            netCashChange
        };

        res.json(response);
    } catch (err) {
        console.error('Annual Cashflow Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

