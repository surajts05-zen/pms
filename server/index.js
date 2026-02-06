const express = require('express');
const cors = require('cors');
const { sequelize, Account, Instrument, Transaction, CashflowTransaction, LedgerAccount, LedgerPosting } = require('./models');
const priceService = require('./priceService');
const portfolioRouter = require('./routes/portfolio');
const { authenticateToken } = require('./routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Accounts
app.get('/api/accounts', authenticateToken, async (req, res) => {
    const accounts = await Account.findAll({
        where: { UserId: req.user.id },
        order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']]
    });
    res.json(accounts);
});

app.post('/api/accounts', authenticateToken, async (req, res) => {
    try {
        const account = await Account.create({ ...req.body, UserId: req.user.id });
        res.status(201).json(account);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/accounts/:id', authenticateToken, async (req, res) => {
    try {
        await Account.update(req.body, {
            where: { id: req.params.id, UserId: req.user.id }
        });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/accounts/:id', authenticateToken, async (req, res) => {
    try {
        const accountId = req.params.id;

        // Check for existing Stock Transactions
        const stockCount = await Transaction.count({ where: { AccountId: accountId } });
        if (stockCount > 0) {
            return res.status(409).json({
                error: 'Account has existing stock transactions.',
                canArchive: true,
                details: `${stockCount} stock transactions found.`
            });
        }

        // Check for existing Cashflow Transactions (as primary or transfer account)
        const cashflowCount = await CashflowTransaction.count({
            where: {
                [sequelize.Sequelize.Op.or]: [
                    { AccountId: accountId },
                    { transferAccountId: accountId }
                ]
            }
        });
        if (cashflowCount > 0) {
            return res.status(409).json({
                error: 'Account has existing cashflow transactions.',
                canArchive: true,
                details: `${cashflowCount} cashflow transactions found.`
            });
        }

        // Check for linked Ledger Account and Postings
        const ledgerAccount = await LedgerAccount.findOne({
            where: { linkedId: accountId, linkedType: 'Account' }
        });

        if (ledgerAccount) {
            const postingCount = await LedgerPosting.count({ where: { ledgerAccountId: ledgerAccount.id } });
            if (postingCount > 0) {

                return res.status(409).json({
                    error: 'Account has existing journal entries.',
                    canArchive: true,
                    details: `${postingCount} journal entries found.`
                });
            }
            // If no postings, we can safely delete the ledger account wrapper too
            await LedgerAccount.destroy({ where: { id: ledgerAccount.id } });
        }

        // If checks pass, delete the account
        await Account.destroy({ where: { id: accountId, UserId: req.user.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/accounts/reorder', authenticateToken, async (req, res) => {
    try {
        const { accounts } = req.body; // Array of { id, displayOrder }
        await Promise.all(
            accounts.map(acc => Account.update(
                { displayOrder: acc.displayOrder },
                { where: { id: acc.id, UserId: req.user.id } }
            ))
        );
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/accounts/bulk-opening-balances', authenticateToken, async (req, res) => {
    try {
        const { accounts } = req.body; // Array of { id, openingBalance, openingBalanceDate }
        await Promise.all(
            accounts.map(acc => Account.update({
                openingBalance: acc.openingBalance,
                openingBalanceDate: acc.openingBalanceDate
            }, { where: { id: acc.id, UserId: req.user.id } }))
        );
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Instruments
app.get('/api/instruments', authenticateToken, async (req, res) => {
    const instruments = await Instrument.findAll({
        where: {
            [sequelize.Sequelize.Op.or]: [
                { UserId: req.user.id },
                { UserId: null } // System-wide instruments
            ]
        }
    });
    res.json(instruments);
});

app.post('/api/instruments', authenticateToken, async (req, res) => {
    try {
        const instrument = await Instrument.create({ ...req.body, UserId: req.user.id });
        res.status(201).json(instrument);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Transactions
app.get('/api/transactions', authenticateToken, async (req, res) => {
    const transactions = await Transaction.findAll({
        where: { UserId: req.user.id },
        include: [
            { model: Account, where: { UserId: req.user.id } },
            Instrument
        ]
    });
    res.json(transactions);
});

app.post('/api/transactions', authenticateToken, async (req, res) => {
    try {
        let { type, quantity } = req.body;

        // Parse Ratio for Splits/Bonuses (e.g., "1:10")
        if (['split', 'bonus', 'demerger'].includes(type) && typeof quantity === 'string' && quantity.includes(':')) {
            const parts = quantity.split(':');
            if (parts.length === 2) {
                const numerator = parseFloat(parts[0]);
                const denominator = parseFloat(parts[1]);
                if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
                    req.body.quantity = numerator / denominator;
                }
            }
        }

        const transaction = await Transaction.create({ ...req.body, UserId: req.user.id });
        res.status(201).json(transaction);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Price Ticker Route
app.get('/api/price/:ticker', async (req, res) => {
    const { ticker } = req.params;
    const price = await priceService.getLatestPrice(ticker);
    if (price) {
        res.json({ ticker, price });
    } else {
        res.status(404).json({ error: 'Price not found' });
    }
});

const { router: authRouter } = require('./routes/auth');

app.use('/api/auth', authRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/fds', require('./routes/fixedDeposit'));
app.use('/api/cashflow', require('./routes/cashflow'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/dividends', require('./routes/dividends'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/accounting', require('./routes/accounting'));
app.use('/api/financial-statements', require('./routes/financialStatements'));
app.use('/api/interest-rates', require('./routes/interestRates'));
app.use('/api/pf', require('./routes/pf'));


// Sync Database and Start Server
sequelize.sync({ alter: true }).then(() => {
    console.log('Database synced');
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to sync database:', err);
});
