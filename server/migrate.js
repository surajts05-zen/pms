const XLSX = require('xlsx');
const path = require('path');
const { Account, Instrument, Transaction, sequelize } = require('./models');

const filePath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');

const conservativeScrips = [
    'ASTRAL', 'BAJFINANCE', 'BHARTIARTL', 'GODREJCP', 'GOKEX', 'GOLDBEES',
    'HAVELLS', 'HDBFS', 'HDFCBANK', 'HINDUNILVR', 'INFRABEES', 'ITC',
    'ITCHOTELS', 'LT', 'MAFANG', 'MID150BEES', 'MON100', 'NIFTYBEES',
    'PAGEIND', 'RELAXO', 'SILVERBEES', 'TATACONSUM', 'TCS', 'TITAN',
    'TMCV', 'TMPV'
];

async function migrate() {
    await sequelize.sync({ force: true });
    console.log('Database synced (reset).');

    const workbook = XLSX.readFile(filePath);

    // 1. Create Accounts
    const dematAccounts = [
        { name: 'Share Khan Long term', type: 'demat', institution: 'Sharekhan' },
        { name: 'Zerodha', type: 'demat', institution: 'Zerodha' },
        { name: 'Shloka', type: 'demat', institution: 'Zerodha' }
    ];

    const dbAccounts = {};
    for (const acc of dematAccounts) {
        dbAccounts[acc.name] = await Account.create(acc);
    }

    // 2. Parse Stock Journal
    const sjSheet = workbook.Sheets['Stock Journal'];
    const data = XLSX.utils.sheet_to_json(sjSheet, { header: 1 });

    const journals = [
        ['Share Khan Long term', 0, 1, 2, 3, 4, 5],
        ['Zerodha', 9, 10, 11, 12, 13, 14],
        ['Shloka', 18, 19, 20, 21, 22, 23]
    ];

    const instrumentCache = {};

    for (const [accName, dateCol, scripCol, typeCol, actionCol, priceCol, qtyCol] of journals) {
        console.log(`Migrating ${accName}...`);
        const account = dbAccounts[accName];

        for (let i = 3; i < data.length; i++) {
            const row = data[i];
            const dateVal = row[dateCol];
            const scrip = row[scripCol];
            const typeVal = String(row[typeCol] || '').toUpperCase();
            const action = String(row[actionCol] || '').toLowerCase();
            const priceVal = row[priceCol];
            const qtyVal = row[qtyCol];

            if (!dateVal || !scrip) continue;

            // Handle Cash scrip specifically
            if (scrip === 'Cash') {
                const date = new Date((dateVal - 25569) * 86400 * 1000);
                const amount = parseFloat(priceVal);
                const qty = parseFloat(qtyVal);

                if (isNaN(amount)) continue;

                let cashType = 'deposit';
                if (action.includes('withdrawal') || action.includes('charges')) {
                    cashType = 'withdrawal';
                } else if (action.includes('adjustments')) {
                    cashType = amount < 0 ? 'withdrawal' : 'deposit';
                }

                if (!instrumentCache['CASH_VIRTUAL']) {
                    instrumentCache['CASH_VIRTUAL'] = await Instrument.create({
                        ticker: 'CASH',
                        name: 'Cash Balance',
                        category: 'safe',
                        type: 'cash'
                    });
                }

                await Transaction.create({
                    AccountId: account.id,
                    InstrumentId: instrumentCache['CASH_VIRTUAL'].id,
                    type: cashType,
                    transactionDate: date.toISOString().split('T')[0],
                    quantity: 1,
                    price: Math.abs(amount * (qty || 1)),
                    fees: 0,
                    notes: `Imported Cash ${action}`
                });
                continue;
            }

            if (isNaN(parseFloat(qtyVal))) continue;

            const date = new Date((dateVal - 25569) * 86400 * 1000);
            const price = parseFloat(priceVal) || 0;
            const qty = parseFloat(qtyVal) || 0;

            let mappedType = 'buy';
            if (action.includes('sell')) mappedType = 'sell';
            else if (action.includes('bonus')) mappedType = 'bonus';
            else if (action.includes('split')) mappedType = 'split';
            else if (action.includes('tfr - in')) mappedType = 'transfer_in';
            else if (action.includes('tfr - out')) mappedType = 'transfer_out';

            let category = 'aspiration';
            if (typeVal === 'M') category = 'conservative';
            else if (typeVal === 'A') category = 'aspiration';
            else if (conservativeScrips.includes(scrip)) category = 'conservative';

            if (!instrumentCache[scrip]) {
                instrumentCache[scrip] = await Instrument.create({
                    ticker: scrip + '.NS',
                    name: scrip,
                    category: category,
                    type: 'stock'
                });
            }

            await Transaction.create({
                AccountId: account.id,
                InstrumentId: instrumentCache[scrip].id,
                type: mappedType,
                transactionDate: date.toISOString().split('T')[0],
                quantity: qty,
                price: price,
                fees: 0
            });
        }
    }

    // 3. Parse Dividends
    console.log('Migrating Dividends...');
    const divSheet = workbook.Sheets['Dividend'];
    if (divSheet) {
        const divData = XLSX.utils.sheet_to_json(divSheet, { header: 1 });
        for (let i = 2; i < divData.length; i++) {
            const row = divData[i];
            const dateVal = row[0];
            const scrip = row[1];
            const amount = parseFloat(row[2]);

            if (!dateVal || !scrip || isNaN(amount)) continue;

            const date = new Date((dateVal - 25569) * 86400 * 1000);
            let accountId = dbAccounts['Share Khan Long term'].id;

            if (!instrumentCache[scrip]) {
                instrumentCache[scrip] = await Instrument.create({
                    ticker: scrip + '.NS',
                    name: scrip,
                    category: conservativeScrips.includes(scrip) ? 'conservative' : 'aspiration',
                    type: 'stock'
                });
            }

            await Transaction.create({
                AccountId: accountId,
                InstrumentId: instrumentCache[scrip].id,
                type: 'dividend',
                transactionDate: date.toISOString().split('T')[0],
                quantity: 1,
                price: amount,
                fees: 0
            });
        }
    }

    console.log('Migration completed successfully.');
}

migrate().catch(console.error);
