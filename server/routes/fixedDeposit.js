const express = require('express');
const router = express.Router();
const { FixedDeposit, Account, Transaction, sequelize } = require('../models');
const { authenticateToken } = require('./auth');

// GET all FDs
router.get('/', authenticateToken, async (req, res) => {
    try {
        const fds = await FixedDeposit.findAll({
            where: { UserId: req.user.id },
            order: [['startDate', 'DESC']]
        });
        res.json(fds);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create FD
router.post('/', authenticateToken, async (req, res) => {
    try {
        const fd = await FixedDeposit.create({ ...req.body, UserId: req.user.id });
        res.status(201).json(fd);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT update FD
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const [updated] = await FixedDeposit.update(req.body, {
            where: { id: req.params.id, UserId: req.user.id }
        });
        if (updated) {
            const updatedFD = await FixedDeposit.findOne({ where: { id: req.params.id, UserId: req.user.id } });
            res.json(updatedFD);
        } else {
            res.status(404).json({ error: 'Fixed Deposit not found' });
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE FD
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const deleted = await FixedDeposit.destroy({
            where: { id: req.params.id, UserId: req.user.id }
        });
        if (deleted) {
            res.json({ success: true, message: 'Fixed Deposit deleted' });
        } else {
            res.status(404).json({ error: 'Fixed Deposit not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST Redeem FD
router.post('/:id/redeem', authenticateToken, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { redemptionDate, finalAmount, accountId } = req.body;

        const fd = await FixedDeposit.findOne({ where: { id, UserId: req.user.id } });
        if (!fd) {
            await t.rollback();
            return res.status(404).json({ error: 'Fixed Deposit not found or access denied' });
        }

        if (fd.status === 'REDEEMED') {
            await t.rollback();
            return res.status(400).json({ error: 'Fixed Deposit already redeemed' });
        }

        const principal = Number(fd.principalAmount);
        const totalRedemption = Number(finalAmount);
        const interestComponent = totalRedemption - principal;

        // 1. Update FD Status
        await fd.update({ status: 'REDEEMED' }, { transaction: t });

        // 2. Add Transactions (Principal + Interest) if Account ID provided
        if (accountId) {
            // Credit Principal
            await Transaction.create({
                type: 'deposit',
                transactionDate: redemptionDate,
                quantity: principal,
                price: 1,
                notes: `FD Redemption (Principal) - ${fd.bankName}`,
                AccountId: accountId,
                UserId: req.user.id,
                InstrumentId: null // Cash transaction
            }, { transaction: t });

            // Credit Interest
            if (interestComponent > 0) {
                await Transaction.create({
                    type: 'deposit', // or 'interest' if extended enum
                    transactionDate: redemptionDate,
                    quantity: interestComponent,
                    price: 1,
                    notes: `FD Redemption (Interest) - ${fd.bankName}`,
                    AccountId: accountId,
                    UserId: req.user.id,
                    InstrumentId: null
                }, { transaction: t });
            }

            // Update Account Balance
            const account = await Account.findOne({ where: { id: accountId, UserId: req.user.id } });
            if (account) {
                await account.increment('balance', { by: totalRedemption, transaction: t });
            }
        }

        await t.commit();
        res.json({ success: true, message: 'FD Redeemed Successfully' });

    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
