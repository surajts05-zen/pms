const express = require('express');
const router = express.Router();
const { InstrumentInterestRate } = require('../models');
const { authenticateToken } = require('./auth');
const { Op } = require('sequelize');

// GET all interest rates
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { type } = req.query;
        const where = { UserId: req.user.id };
        if (type) {
            where.instrumentType = type;
        }

        const rates = await InstrumentInterestRate.findAll({
            where,
            order: [['effectiveFrom', 'DESC']]
        });
        res.json(rates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create interest rate
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { instrumentType, rate, effectiveFrom, effectiveTo } = req.body;
        const newRate = await InstrumentInterestRate.create({
            instrumentType,
            rate,
            effectiveFrom,
            effectiveTo,
            UserId: req.user.id
        });
        res.status(201).json(newRate);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// PUT update interest rate
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const [updated] = await InstrumentInterestRate.update(req.body, {
            where: { id: req.params.id, UserId: req.user.id }
        });
        if (updated) {
            const updatedRate = await InstrumentInterestRate.findOne({ where: { id: req.params.id, UserId: req.user.id } });
            res.json(updatedRate);
        } else {
            res.status(404).json({ error: 'Interest rate not found' });
        }
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE interest rate
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const deleted = await InstrumentInterestRate.destroy({
            where: { id: req.params.id, UserId: req.user.id }
        });
        if (deleted) {
            res.json({ success: true, message: 'Interest rate deleted' });
        } else {
            res.status(404).json({ error: 'Interest rate not found' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
