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

module.exports = router;
