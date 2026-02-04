const { Transaction, Account, Instrument } = require('./models');

async function checkData() {
    const tCount = await Transaction.count();
    const aCount = await Account.count();
    const iCount = await Instrument.count();

    console.log(`Transactions: ${tCount}`);
    console.log(`Accounts: ${aCount}`);
    console.log(`Instruments: ${iCount}`);

    const latest = await Transaction.findAll({
        limit: 5,
        include: [Account, Instrument],
        order: [['transactionDate', 'DESC']]
    });

    latest.forEach(t => {
        console.log(`${t.transactionDate} | ${t.Instrument.name} | ${t.Account.name} | ${t.type} | ${t.quantity} @ ${t.price}`);
    });
}

checkData().catch(console.error);
