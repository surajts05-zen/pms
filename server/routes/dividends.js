const express = require('express');
const router = express.Router();
const { CashflowTransaction, CashflowCategory, Account } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../db');

// Get dividend summary with all aggregations
router.get('/summary', async (req, res) => {
    try {
        const { year } = req.query;

        // Find the Dividend category
        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income' }
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
            type: 'income'
        };

        if (year) {
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;
            where.transactionDate = {
                [Op.gte]: startDate,
                [Op.lte]: endDate
            };
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
router.get('/by-year', async (req, res) => {
    try {
        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income' }
        });

        if (!dividendCategory) {
            return res.json([]);
        }

        const results = await CashflowTransaction.findAll({
            attributes: [
                [sequelize.fn('YEAR', sequelize.col('transactionDate')), 'year'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: {
                CashflowCategoryId: dividendCategory.id,
                type: 'income'
            },
            group: [sequelize.fn('YEAR', sequelize.col('transactionDate'))],
            order: [[sequelize.fn('YEAR', sequelize.col('transactionDate')), 'ASC']],
            raw: true
        });

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get dividends aggregated by scrip
router.get('/by-scrip', async (req, res) => {
    try {
        const { year } = req.query;

        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income' }
        });

        if (!dividendCategory) {
            return res.json([]);
        }

        let where = {
            CashflowCategoryId: dividendCategory.id,
            type: 'income',
            scrip: { [Op.ne]: null }
        };

        if (year) {
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;
            where.transactionDate = {
                [Op.gte]: startDate,
                [Op.lte]: endDate
            };
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
router.get('/by-quarter', async (req, res) => {
    try {
        const { year } = req.query;

        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income' }
        });

        if (!dividendCategory) {
            return res.json([]);
        }

        let where = {
            CashflowCategoryId: dividendCategory.id,
            type: 'income'
        };

        if (year) {
            const startDate = `${year}-01-01`;
            const endDate = `${year}-12-31`;
            where.transactionDate = {
                [Op.gte]: startDate,
                [Op.lte]: endDate
            };
        }

        const results = await CashflowTransaction.findAll({
            attributes: [
                [sequelize.fn('YEAR', sequelize.col('transactionDate')), 'year'],
                [sequelize.fn('QUARTER', sequelize.col('transactionDate')), 'quarter'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where,
            group: [
                sequelize.fn('YEAR', sequelize.col('transactionDate')),
                sequelize.fn('QUARTER', sequelize.col('transactionDate'))
            ],
            order: [
                [sequelize.fn('YEAR', sequelize.col('transactionDate')), 'DESC'],
                [sequelize.fn('QUARTER', sequelize.col('transactionDate')), 'ASC']
            ],
            raw: true
        });

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get dividend trends (monthly data for charts)
router.get('/trends', async (req, res) => {
    try {
        const { startYear, endYear } = req.query;

        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income' }
        });

        if (!dividendCategory) {
            return res.json([]);
        }

        let where = {
            CashflowCategoryId: dividendCategory.id,
            type: 'income'
        };

        if (startYear && endYear) {
            const startDate = `${startYear}-01-01`;
            const endDate = `${endYear}-12-31`;
            where.transactionDate = {
                [Op.gte]: startDate,
                [Op.lte]: endDate
            };
        }

        const results = await CashflowTransaction.findAll({
            attributes: [
                [sequelize.fn('YEAR', sequelize.col('transactionDate')), 'year'],
                [sequelize.fn('MONTH', sequelize.col('transactionDate')), 'month'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount']
            ],
            where,
            group: [
                sequelize.fn('YEAR', sequelize.col('transactionDate')),
                sequelize.fn('MONTH', sequelize.col('transactionDate'))
            ],
            order: [
                [sequelize.fn('YEAR', sequelize.col('transactionDate')), 'ASC'],
                [sequelize.fn('MONTH', sequelize.col('transactionDate')), 'ASC']
            ],
            raw: true
        });

        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get scrip-wise breakdown by year and quarter
router.get('/scrip-breakdown', async (req, res) => {
    try {
        const { scrip, year } = req.query;

        if (!scrip) {
            return res.status(400).json({ error: 'Scrip parameter required' });
        }

        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income' }
        });

        if (!dividendCategory) {
            return res.json([]);
        }

        let where = {
            CashflowCategoryId: dividendCategory.id,
            type: 'income',
            scrip
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
