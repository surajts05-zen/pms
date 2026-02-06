const express = require('express');
const router = express.Router();
const { CashflowTransaction, CashflowCategory, Account } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../db');
const { authenticateToken } = require('./auth');

// Helper to build date where clause
const buildDateWhere = (query) => {
    const { startDate, endDate, year } = query;
    let dateWhere = {};

    if (startDate && endDate) {
        dateWhere = {
            [Op.gte]: startDate,
            [Op.lte]: endDate
        };
    } else if (year && year !== 'all') {
        const startYear = parseInt(year);
        dateWhere = {
            [Op.gte]: `${startYear}-01-01`,
            [Op.lte]: `${startYear}-12-31`
        };
    }
    return dateWhere;
};

// Get dividend summary with all aggregations
router.get('/summary', authenticateToken, async (req, res) => {
    try {
        // Find the Dividend category
        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income', UserId: req.user.id }
        });

        if (!dividendCategory) {
            return res.json({
                totalDividends: 0,
                transactionCount: 0,
                uniqueScrips: 0,
                byYear: [],
                byScrip: [],
                byQuarter: []
            });
        }

        // Build where clause
        let where = {
            CashflowCategoryId: dividendCategory.id,
            type: 'income',
            UserId: req.user.id
        };

        const dateWhere = buildDateWhere(req.query);
        if (Object.keys(dateWhere).length > 0) {
            where.transactionDate = dateWhere;
        }

        // Get all dividend transactions
        const transactions = await CashflowTransaction.findAll({
            where,
            include: [
                { model: Account },
                { model: CashflowCategory }
            ],
            order: [['transactionDate', 'DESC']]
        });

        // Calculate total dividends
        const totalDividends = transactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

        // Count unique scrips
        const uniqueScrips = new Set(transactions.filter(t => t.scrip).map(t => t.scrip)).size;

        res.json({
            totalDividends,
            transactionCount: transactions.length,
            uniqueScrips,
            transactions
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get dividends aggregated by year
router.get('/by-year', authenticateToken, async (req, res) => {
    try {
        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income', UserId: req.user.id }
        });

        if (!dividendCategory) {
            return res.json([]);
        }

        const results = await CashflowTransaction.findAll({
            attributes: [
                [sequelize.literal('EXTRACT(YEAR FROM "transactionDate")'), 'year'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                CashflowCategoryId: dividendCategory.id,
                type: 'income',
                UserId: req.user.id
            },
            group: [sequelize.literal('EXTRACT(YEAR FROM "transactionDate")')],
            order: [[sequelize.literal('EXTRACT(YEAR FROM "transactionDate")'), 'ASC']],
            raw: true
        });

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get dividends aggregated by scrip
router.get('/by-scrip', authenticateToken, async (req, res) => {
    try {
        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income', UserId: req.user.id }
        });

        if (!dividendCategory) {
            return res.json([]);
        }

        let where = {
            CashflowCategoryId: dividendCategory.id,
            type: 'income',
            scrip: { [Op.ne]: null },
            UserId: req.user.id
        };

        const dateWhere = buildDateWhere(req.query);
        if (Object.keys(dateWhere).length > 0) {
            where.transactionDate = dateWhere;
        }

        const results = await CashflowTransaction.findAll({
            attributes: [
                'scrip',
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where,
            group: ['scrip'],
            order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
            raw: true
        });

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get dividends aggregated by quarter
router.get('/by-quarter', authenticateToken, async (req, res) => {
    try {
        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income', UserId: req.user.id }
        });

        if (!dividendCategory) {
            return res.json([]);
        }

        let where = {
            CashflowCategoryId: dividendCategory.id,
            type: 'income',
            UserId: req.user.id
        };

        const dateWhere = buildDateWhere(req.query);
        if (Object.keys(dateWhere).length > 0) {
            where.transactionDate = dateWhere;
        }

        const results = await CashflowTransaction.findAll({
            attributes: [
                [sequelize.literal('EXTRACT(YEAR FROM "transactionDate")'), 'year'],
                [sequelize.literal('EXTRACT(QUARTER FROM "transactionDate")'), 'quarter'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where,
            group: [
                sequelize.literal('EXTRACT(YEAR FROM "transactionDate")'),
                sequelize.literal('EXTRACT(QUARTER FROM "transactionDate")')
            ],
            order: [
                [sequelize.literal('EXTRACT(YEAR FROM "transactionDate")'), 'DESC'],
                [sequelize.literal('EXTRACT(QUARTER FROM "transactionDate")'), 'ASC']
            ],
            raw: true
        });

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get dividend trends (monthly data for charts)
router.get('/trends', authenticateToken, async (req, res) => {
    try {
        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income', UserId: req.user.id }
        });

        if (!dividendCategory) {
            return res.json([]);
        }

        let where = {
            CashflowCategoryId: dividendCategory.id,
            type: 'income',
            UserId: req.user.id
        };

        const dateWhere = buildDateWhere(req.query);
        if (Object.keys(dateWhere).length > 0) {
            where.transactionDate = dateWhere;
        }

        const results = await CashflowTransaction.findAll({
            attributes: [
                [sequelize.literal('EXTRACT(YEAR FROM "transactionDate")'), 'year'],
                [sequelize.literal('EXTRACT(MONTH FROM "transactionDate")'), 'month'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
            ],
            where,
            group: [
                sequelize.literal('EXTRACT(YEAR FROM "transactionDate")'),
                sequelize.literal('EXTRACT(MONTH FROM "transactionDate")')
            ],
            order: [
                [sequelize.literal('EXTRACT(YEAR FROM "transactionDate")'), 'ASC'],
                [sequelize.literal('EXTRACT(MONTH FROM "transactionDate")'), 'ASC']
            ],
            raw: true
        });

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get scrip-wise breakdown by year and quarter
router.get('/scrip-breakdown', authenticateToken, async (req, res) => {
    try {
        const { scrip, year } = req.query;

        if (!scrip) {
            return res.status(400).json({ error: 'Scrip parameter required' });
        }

        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income', UserId: req.user.id }
        });

        if (!dividendCategory) {
            return res.json([]);
        }

        let where = {
            CashflowCategoryId: dividendCategory.id,
            type: 'income',
            scrip,
            UserId: req.user.id
        };

        if (year) {
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;
            where.transactionDate = {
                [Op.gte]: startDate,
                [Op.lte]: endDate
            };
        }

        const transactions = await CashflowTransaction.findAll({
            where,
            include: [{ model: Account }],
            order: [['transactionDate', 'DESC']]
        });

        res.json(transactions);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
