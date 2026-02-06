const { Account } = require('./models');

async function listAccounts() {
    try {
        const names = ['ICICI', 'Sharekhan - Conservative', 'Zerodha - Aspirational'];
        const accounts = await Account.findAll({
            where: { name: names }
        });
        console.log('TARGET_ACCOUNTS_START');
        accounts.forEach(acc => {
            console.log(`- ${acc.name}: ${acc.id} (${acc.type})`);
        });
        console.log('TARGET_ACCOUNTS_END');
        process.exit(0);
    } catch (error) {
        console.error('Error listing accounts:', error);
        process.exit(1);
    }
}

listAccounts();
