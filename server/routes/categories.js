const express = require('express');
const router = express.Router();
const { CashflowCategory } = require('../models');

// Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await CashflowCategory.findAll({
            where: { isActive: true },
            order: [['type', 'ASC'], ['displayOrder', 'ASC'], ['name', 'ASC']]
        });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new category
router.post('/', async (req, res) => {
    try {
        const category = await CashflowCategory.create(req.body);
        res.status(201).json(category);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update category
router.put('/:id', async (req, res) => {
    try {
        await CashflowCategory.update(req.body, { where: { id: req.params.id } });
        const updated = await CashflowCategory.findByPk(req.params.id);
        res.json(updated);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete category (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        await CashflowCategory.update({ isActive: false }, { where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
