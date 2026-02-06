const express = require('express');
const router = express.Router();
const {
    Account,
    FixedDeposit,
    CashflowTransaction,
    CashflowCategory,
    Transaction,
    Instrument,
    sequelize
} = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('./auth');
const portfolioRouter = require('./portfolio');

router.get('/summary', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // 1. Bank & Cash Balance
        const bankBalance = await Account.sum('balance', {
            where: {
                type: { [Op.in]: ['bank', 'cash'] },
                isArchived: false,
                UserId: userId
            }
        }) || 0;

        // 2. Fixed Deposits Total
        const fdTotal = await FixedDeposit.sum('principalAmount', {
            where: {
                status: 'ACTIVE',
                UserId: userId
            }
        }) || 0;

        // 3. PF Total
        const pfTotal = await Account.sum('balance', {
            where: {
                type: 'pf',
                isArchived: false,
                UserId: userId
            }
        }) || 0;

        // 4. PPF Total
        const ppfTotal = await Account.sum('balance', {
            where: {
                type: 'ppf',
                isArchived: false,
                UserId: userId
            }
        }) || 0;

        // 5. SSY Total
        const ssyTotal = await Account.sum('balance', {
            where: {
                type: 'ssy',
                isArchived: false,
                UserId: userId
            }
        }) || 0;

        // 6. Monthly Dividends
        const divCategory = await CashflowCategory.findOne({
            where: {
                name: 'Dividend',
                UserId: userId
            }
        });

        let monthlyDividends = 0;
        if (divCategory) {
            monthlyDividends = await CashflowTransaction.sum('amount', {
                where: {
                    CashflowCategoryId: divCategory.id,
                    transactionDate: { [Op.gte]: startOfMonth },
                    UserId: userId
                }
            }) || 0;
        }

        res.json({
            bankBalance: parseFloat(bankBalance),
            fdTotal: parseFloat(fdTotal),
            pfTotal: parseFloat(pfTotal),
            ppfTotal: parseFloat(ppfTotal),
            ssyTotal: parseFloat(ssyTotal),
            monthlyDividends: parseFloat(monthlyDividends),
        });

    } catch (err) {
        console.error('Dashboard Summary Error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
