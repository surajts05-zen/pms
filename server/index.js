const express = require('express');
const cors = require('cors');
const { sequelize, Account, Instrument, Transaction } = require('./models');
const priceService = require('./priceService');
const portfolioRouter = require('./routes/portfolio');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Accounts
app.get('/api/accounts', async (req, res) => {
    const accounts = await Account.findAll({ order: [['displayOrder', 'ASC'], ['createdAt', 'ASC']] });
    res.json(accounts);
});

app.post('/api/accounts', async (req, res) => {
    try {
        const account = await Account.create(req.body);
        res.status(201).json(account);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/accounts/:id', async (req, res) => {
    try {
        await Account.update(req.body, { where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/accounts/:id', async (req, res) => {
    try {
        await Account.destroy({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.put('/api/accounts/reorder', async (req, res) => {
    try {
        const { accounts } = req.body; // Array of { id, displayOrder }
        await Promise.all(
            accounts.map(acc => Account.update({ displayOrder: acc.displayOrder }, { where: { id: acc.id } }))
        );
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Instruments
app.get('/api/instruments', async (req, res) => {
    const instruments = await Instrument.findAll();
    res.json(instruments);
});

app.post('/api/instruments', async (req, res) => {
    try {
        const instrument = await Instrument.create(req.body);
        res.status(201).json(instrument);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Transactions
app.get('/api/transactions', async (req, res) => {
    const transactions = await Transaction.findAll({ include: [Account, Instrument] });
    res.json(transactions);
});

app.post('/api/transactions', async (req, res) => {
    try {
        const transaction = await Transaction.create(req.body);
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

app.use('/api/portfolio', portfolioRouter);
app.use('/api/fds', require('./routes/fixedDeposit'));
app.use('/api/cashflow', require('./routes/cashflow'));
app.use('/api/categories', require('./routes/categories'));

// Sync Database and Start Server
sequelize.sync({ alter: true }).then(() => {
    console.log('Database synced');
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to sync database:', err);
});
