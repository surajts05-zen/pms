const express = require('express');
const cors = require('cors');
const { sequelize, Account, Instrument, Transaction, CashflowTransaction, LedgerAccount, LedgerPosting } = require('./models');
const { Op } = require('sequelize');
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

app.get('/api/instruments/search', authenticateToken, async (req, res) => {
    try {
        const { q, types } = req.query;
        // console.log('Search Params:', { q, types });

        if (!q || q.length < 2) {
            return res.json([]);
        }

        const typeList = types ? types.split(',') : [];
        const validDbTypes = ['stock', 'etf', 'fd', 'cash', 'mf']; // Valid ENUM values in DB

        // If specific types requested, filter for DB query
        let runDbSearch = true;

        const whereClause = {
            [Op.or]: [
                { ticker: { [Op.iLike]: `%${q}%` } },
                { name: { [Op.iLike]: `%${q}%` } }
            ]
        };

        if (typeList.length > 0) {
            const dbQueryTypes = typeList.filter(t => validDbTypes.includes(t));
            if (dbQueryTypes.length > 0) {
                whereClause.type = { [Op.in]: dbQueryTypes };
            } else {
                // User requested types that don't exist in DB (e.g. only 'index')
                // So DB search should yield 0 results.
                runDbSearch = false;
            }
        }

        // console.log('Where Clause:', JSON.stringify(whereClause, null, 2));

        // 1. Search Local DB
        let dbResults = [];
        if (runDbSearch) {
            dbResults = await Instrument.findAll({
                where: whereClause,
                limit: 5
            });
        }

        let results = dbResults.map(i => ({ ...i.toJSON(), source: 'local' }));

        // 2. If fewer than 5, search external API (only if type 'stock', 'etf', 'index' is allowed or not filtered)
        // Assume external API returns stocks/ETFs mainly.
        const allowExternal = typeList.length === 0 || typeList.some(t => ['stock', 'etf', 'index', 'mf'].includes(t));

        if (results.length < 5 && allowExternal) {
            try {
                const apiResults = await priceService.search(q);
                // Filter out existing ones
                const existingTickers = new Set(results.map(r => r.ticker));
                const newResults = apiResults.filter(r => !existingTickers.has(r.ticker));

                results = [...results, ...newResults.map(r => ({ ...r, source: 'remote' }))];
            } catch (apiErr) {
                console.error("API Search failed:", apiErr.message);
            }
        }

        res.json(results.slice(0, 10)); // Limit total to 10
    } catch (err) {
        console.error("Search Route Error:", err);
        res.status(400).json({ error: err.message });
    }
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

app.put('/api/transactions/:id', authenticateToken, async (req, res) => {
    try {
        await Transaction.update(req.body, {
            where: { id: req.params.id, UserId: req.user.id }
        });

        // Also update CashflowTransaction if linked
        // This is a simplified approach; ideally we should sync them properly
        // For now, assuming direct editing of transaction implies we might need to adjust linked cashflow manually or via separate logic

        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/transactions/:id', authenticateToken, async (req, res) => {
    try {
        await Transaction.destroy({
            where: { id: req.params.id, UserId: req.user.id }
        });

        await CashflowTransaction.destroy({
            where: { linkedTransactionId: req.params.id, UserId: req.user.id }
        });

        res.json({ success: true });
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
