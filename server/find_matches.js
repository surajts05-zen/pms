const { CashflowTransaction, Account, sequelize } = require('./models');
const { Op } = require('sequelize');

async function findMatches() {
    try {
        const icici = await Account.findOne({ where: { name: 'ICICI' } });
        const sharekhan = await Account.findOne({ where: { name: 'Sharekhan - Conservative' } });
        const zerodha = await Account.findOne({ where: { name: 'Zerodha - Aspirational' } });

        const fs = require('fs');
        let output = `ICICI: ${icici?.id}\nSharekhan: ${sharekhan?.id}\nZerodha: ${zerodha?.id}\n\n`;

        const { CashflowCategory } = require('./models');
        const matches = await CashflowTransaction.findAll({
            where: {
                AccountId: icici.id,
                [Op.or]: [
                    { description: { [Op.like]: '%Sharekhan%' } },
                    { description: { [Op.like]: '%Zerodha%' } },
                    { description: { [Op.like]: '%Shloka%' } },
                    { scrip: { [Op.not]: null } }
                ]
            },
            include: [CashflowCategory],
            order: [['transactionDate', 'ASC']]
        });

        output += `Found ${matches.length} potential matching transactions in ICICI:\n`;
        matches.forEach(m => {
            output += `[${m.transactionDate}] ${m.description} | Amt: ${m.amount} | Type: ${m.type} | Cat: ${m.CashflowCategory?.name} | Scrip: ${m.scrip}\n`;
        });

        const shlokaMatches = await CashflowTransaction.findAll({
            where: {
                [Op.or]: [
                    { description: { [Op.like]: '%Shloka%' } }
                ]
            }
        });
        output += `\nFound ${shlokaMatches.length} total Shloka related transactions:\n`;
        for (const m of shlokaMatches) {
            const acc = await m.getAccount();
            output += `[${m.transactionDate}] ${m.description} | Amt: ${m.amount} | Account: ${acc.name}\n`;
        }

        fs.writeFileSync('server/matches_output.txt', output);
        console.log('Output written to server/matches_output.txt');

        if (sharekhan) {
            const skCount = await CashflowTransaction.count({ where: { AccountId: sharekhan.id } });
            console.log(`Sharekhan already has ${skCount} transitions`);
        }
        if (zerodha) {
            const zCount = await CashflowTransaction.count({ where: { AccountId: zerodha.id } });
            console.log(`Zerodha already has ${zCount} transitions`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error finding matches:', error);
        process.exit(1);
    }
}

findMatches();
