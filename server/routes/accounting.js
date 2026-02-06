const express = require('express');
const router = express.Router();
const { LedgerAccount, JournalEntry, LedgerPosting } = require('../models');
const { authenticateToken } = require('./auth');

// --- Ledger Accounts (CoA) ---

// Fetch CoA
router.get('/coa', authenticateToken, async (req, res) => {
    try {
        const accounts = await LedgerAccount.findAll({
            where: { UserId: req.user.id },
            order: [['type', 'ASC'], ['name', 'ASC']]
        });
        res.json(accounts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Ledger Account
router.post('/coa', authenticateToken, async (req, res) => {
    try {
        const account = await LedgerAccount.create({ ...req.body, UserId: req.user.id });
        res.status(201).json(account);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Update Ledger Account
router.put('/coa/:id', authenticateToken, async (req, res) => {
    try {
        await LedgerAccount.update(req.body, {
            where: { id: req.params.id, UserId: req.user.id }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete Ledger Account
router.delete('/coa/:id', authenticateToken, async (req, res) => {
    try {
        await LedgerAccount.destroy({
            where: { id: req.params.id, UserId: req.user.id }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// --- Journal Entries ---

// Fetch Journals
router.get('/journals', authenticateToken, async (req, res) => {
    try {
        const journals = await JournalEntry.findAll({
            where: { UserId: req.user.id },
            include: [{
                model: LedgerPosting,
                where: { UserId: req.user.id },
                include: [{ model: LedgerAccount, where: { UserId: req.user.id } }]
            }],
            order: [['transactionDate', 'DESC'], ['createdAt', 'DESC']]
        });
        res.json(journals);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create Journal Entry (with postings)
router.post('/journals', authenticateToken, async (req, res) => {
    const t = await LedgerPosting.sequelize.transaction();
    try {
        const { transactionDate, description, postings } = req.body;

        // 1. Validate balanced postings
        const totalDebit = postings.reduce((sum, p) => sum + parseFloat(p.debit || 0), 0);
        const totalCredit = postings.reduce((sum, p) => sum + parseFloat(p.credit || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return res.status(400).json({ error: 'Journal must be balanced (Debits must equal Credits)' });
        }

        // 2. Create Journal
        const journal = await JournalEntry.create({
            transactionDate,
            description,
            referenceType: 'Manual',
            UserId: req.user.id
        }, { transaction: t });

        // 3. Create Postings
        for (const p of postings) {
            await LedgerPosting.create({
                journalEntryId: journal.id,
                ledgerAccountId: p.ledgerAccountId,
                debit: p.debit || 0,
                credit: p.credit || 0,
                UserId: req.user.id
            }, { transaction: t });
        }

        await t.commit();
        res.status(201).json(journal);
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});

// Update Journal Entry (with postings - full replacement of postings)
router.put('/journals/:id', authenticateToken, async (req, res) => {
    const t = await LedgerPosting.sequelize.transaction();
    try {
        const { transactionDate, description, postings } = req.body;

        // 1. Validate balanced postings
        const totalDebit = postings.reduce((sum, p) => sum + parseFloat(p.debit || 0), 0);
        const totalCredit = postings.reduce((sum, p) => sum + parseFloat(p.credit || 0), 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return res.status(400).json({ error: 'Journal must be balanced' });
        }

        // 2. Update Journal
        await JournalEntry.update({ transactionDate, description }, {
            where: { id: req.params.id, UserId: req.user.id },
            transaction: t
        });

        // 3. Replace Postings
        await LedgerPosting.destroy({
            where: { journalEntryId: req.params.id, UserId: req.user.id },
            transaction: t
        });
        for (const p of postings) {
            await LedgerPosting.create({
                journalEntryId: req.params.id,
                ledgerAccountId: p.ledgerAccountId,
                debit: p.debit || 0,
                credit: p.credit || 0,
                UserId: req.user.id
            }, { transaction: t });
        }

        await t.commit();
        res.json({ success: true });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});

// Delete Journal Entry
router.delete('/journals/:id', authenticateToken, async (req, res) => {
    try {
        // Postings will be deleted via CASCADE if defined, otherwise manual delete needed
        // Assuming CASCADE is not default in Sequelize without explicit declaration
        await LedgerPosting.destroy({
            where: { journalEntryId: req.params.id, UserId: req.user.id }
        });
        await JournalEntry.destroy({
            where: { id: req.params.id, UserId: req.user.id }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});


// --- FD/RD Quick Journal Entries ---

// Create FD: Debit FD Account, Credit Bank Account
router.post('/fd/create', authenticateToken, async (req, res) => {
    const t = await LedgerPosting.sequelize.transaction();
    try {
        const { transactionDate, fdAccountId, bankAccountId, amount, description } = req.body;

        if (!fdAccountId || !bankAccountId || !amount) {
            return res.status(400).json({ error: 'FD Account, Bank Account, and Amount are required' });
        }

        const journal = await JournalEntry.create({
            transactionDate,
            description: description || 'Fixed Deposit Created',
            referenceType: 'FD_Create',
            UserId: req.user.id
        }, { transaction: t });

        // Debit FD Account (Asset increases)
        await LedgerPosting.create({
            journalEntryId: journal.id,
            ledgerAccountId: fdAccountId,
            debit: parseFloat(amount),
            credit: 0,
            UserId: req.user.id
        }, { transaction: t });

        // Credit Bank Account (Asset decreases)
        await LedgerPosting.create({
            journalEntryId: journal.id,
            ledgerAccountId: bankAccountId,
            debit: 0,
            credit: parseFloat(amount),
            UserId: req.user.id
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, journalId: journal.id });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});

// Accrue Interest: Debit FD Account, Credit Interest Income
router.post('/fd/accrue-interest', authenticateToken, async (req, res) => {
    const t = await LedgerPosting.sequelize.transaction();
    try {
        const { transactionDate, fdAccountId, interestIncomeAccountId, amount, description } = req.body;

        if (!fdAccountId || !interestIncomeAccountId || !amount) {
            return res.status(400).json({ error: 'FD Account, Interest Income Account, and Amount are required' });
        }

        const journal = await JournalEntry.create({
            transactionDate,
            description: description || 'FD Interest Accrued',
            referenceType: 'FD_Interest',
            UserId: req.user.id
        }, { transaction: t });

        // Debit FD Account (Asset increases with interest)
        await LedgerPosting.create({
            journalEntryId: journal.id,
            ledgerAccountId: fdAccountId,
            debit: parseFloat(amount),
            credit: 0,
            UserId: req.user.id
        }, { transaction: t });

        // Credit Interest Income (Revenue increases)
        await LedgerPosting.create({
            journalEntryId: journal.id,
            ledgerAccountId: interestIncomeAccountId,
            debit: 0,
            credit: parseFloat(amount),
            UserId: req.user.id
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, journalId: journal.id });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});

// TDS Deduction: Debit FD (net) + TDS Receivable (tax), Credit Interest Income (gross)
router.post('/fd/tds', authenticateToken, async (req, res) => {
    const t = await LedgerPosting.sequelize.transaction();
    try {
        const { transactionDate, fdAccountId, tdsAccountId, interestIncomeAccountId, grossInterest, tdsAmount, description } = req.body;

        if (!fdAccountId || !tdsAccountId || !interestIncomeAccountId || !grossInterest || !tdsAmount) {
            return res.status(400).json({ error: 'All accounts and amounts are required' });
        }

        const netInterest = parseFloat(grossInterest) - parseFloat(tdsAmount);

        const journal = await JournalEntry.create({
            transactionDate,
            description: description || 'FD Interest with TDS',
            referenceType: 'FD_TDS',
            UserId: req.user.id
        }, { transaction: t });

        // Debit FD Account (net interest)
        await LedgerPosting.create({
            journalEntryId: journal.id,
            ledgerAccountId: fdAccountId,
            debit: netInterest,
            credit: 0,
            UserId: req.user.id
        }, { transaction: t });

        // Debit TDS Receivable (tax deducted)
        await LedgerPosting.create({
            journalEntryId: journal.id,
            ledgerAccountId: tdsAccountId,
            debit: parseFloat(tdsAmount),
            credit: 0,
            UserId: req.user.id
        }, { transaction: t });

        // Credit Interest Income (gross interest)
        await LedgerPosting.create({
            journalEntryId: journal.id,
            ledgerAccountId: interestIncomeAccountId,
            debit: 0,
            credit: parseFloat(grossInterest),
            UserId: req.user.id
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, journalId: journal.id });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});

// FD Maturity: Debit Bank Account, Credit FD Account
router.post('/fd/mature', authenticateToken, async (req, res) => {
    const t = await LedgerPosting.sequelize.transaction();
    try {
        const { transactionDate, fdAccountId, bankAccountId, amount, description } = req.body;

        if (!fdAccountId || !bankAccountId || !amount) {
            return res.status(400).json({ error: 'FD Account, Bank Account, and Amount are required' });
        }

        const journal = await JournalEntry.create({
            transactionDate,
            description: description || 'Fixed Deposit Matured',
            referenceType: 'FD_Mature',
            UserId: req.user.id
        }, { transaction: t });

        // Debit Bank Account (Asset increases)
        await LedgerPosting.create({
            journalEntryId: journal.id,
            ledgerAccountId: bankAccountId,
            debit: parseFloat(amount),
            credit: 0,
            UserId: req.user.id
        }, { transaction: t });

        // Credit FD Account (Asset decreases)
        await LedgerPosting.create({
            journalEntryId: journal.id,
            ledgerAccountId: fdAccountId,
            debit: 0,
            credit: parseFloat(amount),
            UserId: req.user.id
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, journalId: journal.id });
    } catch (err) {
        await t.rollback();
        res.status(400).json({ error: err.message });
    }
});


module.exports = router;
