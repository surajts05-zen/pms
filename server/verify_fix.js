
const fs = require('fs');

async function run() {
    try {
        await new Promise(r => setTimeout(r, 1000)); // Short wait

        const accountsRes = await fetch('http://localhost:5000/api/accounts');
        const accounts = await accountsRes.json();

        const targets = ['KOTAKBANK', 'BAJFINANCE', 'HDFCBANK', 'COFORGE', 'PARAS', 'ASIANPAINT', 'LUPIN'];

        let output = '--- VERIFICATION RESULTS ---\n';

        for (const acc of accounts) {
            const pRes = await fetch(`http://localhost:5000/api/portfolio?accountId=${acc.id}`);
            const pData = await pRes.json();

            output += `\nAccount: ${acc.name}\n`;
            pData.holdings.forEach(h => {
                if (targets.some(t => h.ticker.includes(t))) {
                    output += `  ${h.ticker}: ${h.quantity.toFixed(4)}\n`;
                }
            });
        }

        fs.writeFileSync('verify_output.txt', output);
        console.log('Done.');

    } catch (e) {
        console.error(e);
    }
}

run();
