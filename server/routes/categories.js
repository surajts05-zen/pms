const express = require('express');
const router = express.Router();
const { CashflowCategory } = require('../models');
const { authenticateToken } = require('./auth');

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
    try {
        const categories = await CashflowCategory.findAll({
            where: { isActive: true, UserId: req.user.id },
            order: [['type', 'ASC'], ['displayOrder', 'ASC'], ['name', 'ASC']]
        });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new category
router.post('/', authenticateToken, async (req, res) => {
    try {
        const category = await CashflowCategory.create({ ...req.body, UserId: req.user.id });
        res.status(201).json(category);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update category
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        await CashflowCategory.update(req.body, {
            where: { id: req.params.id, UserId: req.user.id }
        });
        const updated = await CashflowCategory.findOne({
            where: { id: req.params.id, UserId: req.user.id }
        });
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete category (soft delete)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await CashflowCategory.update({ isActive: false }, {
            where: { id: req.params.id, UserId: req.user.id }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
