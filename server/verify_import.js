const { Account, CashflowTransaction, CashflowCategory, sequelize } = require('./models');
const { Op } = require('sequelize');

async function verify() {
    try {
        await sequelize.authenticate();

        console.log('\n=== Accounts in DB ===');
        const accounts = await Account.findAll({
            order: [['name', 'ASC']]
        });
        accounts.forEach(a => {
            console.log(`- ${a.name.padEnd(20)} | Type: ${a.type.padEnd(12)} | Inst: ${a.institution || 'N/A'}`);
        });

        const total = await CashflowTransaction.count();
        console.log(`Total Transactions: ${total}`);

        const months = [
            { name: 'Apr 2025', start: '2025-04-01', end: '2025-04-30' },
            { name: 'May 2025', start: '2025-05-01', end: '2025-05-31' },
            { name: 'Jun 2025', start: '2025-06-01', end: '2025-06-30' },
            { name: 'Jul 2025', start: '2025-07-01', end: '2025-07-31' },
            { name: 'Aug 2025', start: '2025-08-01', end: '2025-08-31' },
            { name: 'Sep 2025', start: '2025-09-01', end: '2025-09-30' },
            { name: 'Oct 2025', start: '2025-10-01', end: '2025-10-31' },
            { name: 'Nov 2025', start: '2025-11-01', end: '2025-11-30' },
            { name: 'Dec 2025', start: '2025-12-01', end: '2025-12-31' },
            { name: 'Jan 2026', start: '2026-01-01', end: '2026-01-31' },
            { name: 'Feb 2026', start: '2026-02-01', end: '2026-02-28' },
        ];

        for (const m of months) {
            const count = await CashflowTransaction.count({
                where: { transactionDate: { [Op.between]: [m.start, m.end] } }
            });
            console.log(`${m.name.padEnd(10)}: ${count.toString().padStart(5)} transactions`);
        }

        const unlinkedTransfers = await CashflowTransaction.count({
            where: {
                type: { [Op.in]: ['transfer_in', 'transfer_out'] },
                linkedTransactionId: null
            }
        });
        console.log(`\nUnlinked Transfers: ${unlinkedTransfers}`);

        console.log('\n=== Category Counts ===');
        const categories = await CashflowCategory.findAll();
        console.log(`Total Categories: ${categories.length}`);

        process.exit(0);
    } catch (error) {
        console.error('Verification failed:', error);
        process.exit(1);
    }
}

verify();
