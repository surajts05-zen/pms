const express = require('express');
const router = express.Router();
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Account, Transaction, CashflowTransaction, sequelize } = require('../models');
const authenticateToken = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

router.get('/summary', authenticateToken, async (req, res) => {
    try {
        const account = await Account.findOne({ where: { type: 'pf', UserId: req.user.id } });
        if (!account) return res.json({ balance: 0, count: 0 });

        const count = await Transaction.count({ where: { AccountId: account.id } });
        res.json({ balance: account.balance, count });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const pfPath = path.resolve(req.file.path);
    const pythonScript = path.resolve(__dirname, '..', '..', 'extract_pf.py');

    const python = spawn('python', [pythonScript, pfPath]);
    let dataString = '';

    python.stdout.on('data', (data) => {
        dataString += data.toString();
    });

    python.on('close', async (code) => {
        if (fs.existsSync(pfPath)) fs.unlinkSync(pfPath);

        if (code !== 0) {
            return res.status(500).json({ error: 'Failed to process PDF' });
        }

        try {
            const result = JSON.parse(dataString);
            if (result.error) throw new Error(result.error);

            const tables = result.data;
            const UserId = req.user.id;
            const account = await Account.findOne({ where: { type: 'pf', UserId } });
            if (!account) return res.status(404).json({ error: 'PF Account not found' });

            const transactions = await Transaction.findAll({ where: { AccountId: account.id, UserId } });
            const importedSet = new Set();
            transactions.forEach(t => {
                const key = `TX|${t.transactionDate}|${parseFloat(t.quantity).toFixed(2)}`;
                importedSet.add(key);
                if (t.notes === 'Annual Interest Credited') {
                    importedSet.add(`INT|${t.transactionDate}|${parseFloat(t.quantity).toFixed(2)}`);
                }
            });

            let addedCount = 0;

            for (const table of tables) {
                let isTransactionTable = false;
                for (const row of table) {
                    const rowContent = JSON.stringify(row);
                    if (rowContent.includes('Wage Month') && rowContent.includes('Transaction')) {
                        isTransactionTable = true;
                        break;
                    }
                }
                if (!isTransactionTable) continue;

                for (const row of table) {
                    const rowStr = JSON.stringify(row);

                    if (rowStr.includes('Int. Updated upto')) {
                        const cell = row.find(c => c && c.includes('Int. Updated upto'));
                        const dateMatch = cell.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                        if (dateMatch) {
                            const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
                            const totalInt = parseFloat((row[6] || '0').replace(/,/g, '')) + parseFloat((row[7] || '0').replace(/,/g, ''));
                            const key = `INT|${date}|${totalInt.toFixed(2)}`;
                            if (totalInt > 0 && !importedSet.has(key)) {
                                await Transaction.create({ AccountId: account.id, type: 'deposit', transactionDate: date, quantity: totalInt, price: 1, notes: 'Annual Interest Credited', UserId });
                                await CashflowTransaction.create({ AccountId: account.id, amount: totalInt, credit: totalInt, transactionDate: date, description: 'Annual Interest Credited', type: 'income', UserId });
                                importedSet.add(key);
                                addedCount++;
                            }
                        }
                    }

                    const dateStr = row[1];
                    if (dateStr && /^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
                        const dateParts = dateStr.split('-');
                        const date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
                        const total = parseFloat((row[6] || '0').replace(/,/g, '')) + parseFloat((row[7] || '0').replace(/,/g, ''));
                        const key = `TX|${date}|${total.toFixed(2)}`;
                        if (total > 0 && !importedSet.has(key)) {
                            await Transaction.create({ AccountId: account.id, type: 'deposit', transactionDate: date, quantity: total, price: 1, notes: row[3] || '', UserId });
                            await CashflowTransaction.create({ AccountId: account.id, amount: total, credit: total, transactionDate: date, description: row[3] || '', type: 'income', UserId });
                            importedSet.add(key);
                            addedCount++;
                        }
                    }
                }
            }

            const totalCredit = await CashflowTransaction.sum('credit', { where: { AccountId: account.id } });
            const totalDebit = await CashflowTransaction.sum('debit', { where: { AccountId: account.id } });
            account.balance = (totalCredit || 0) - (totalDebit || 0);
            await account.save();

            res.json({ message: `Imported ${addedCount} new transactions`, balance: account.balance });

        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });
});

module.exports = router;
