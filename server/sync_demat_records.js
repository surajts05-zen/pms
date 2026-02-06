const { CashflowTransaction, Account, CashflowCategory, Instrument } = require('./models');
const { Op } = require('sequelize');

async function syncRecords() {
    try {
        const icici = await Account.findOne({ where: { name: 'ICICI' } });
        const sharekhan = await Account.findOne({ where: { name: 'Sharekhan - Conservative' } });
        const zerodha = await Account.findOne({ where: { name: 'Zerodha - Aspirational' } });

        if (!icici || !sharekhan || !zerodha) {
            console.error('Missing required accounts');
            process.exit(1);
        }

        console.log(`Syncing from ICICI (${icici.id}) to:`);
        console.log(`- Sharekhan (${sharekhan.id})`);
        console.log(`- Zerodha (${zerodha.id})`);

        // 1. Sync Transfers and specific category matches from ICICI
        const iciciTrans = await CashflowTransaction.findAll({
            where: { AccountId: icici.id },
            include: [CashflowCategory]
        });

        let transferredCount = 0;
        for (const m of iciciTrans) {
            let targetAccount = null;
            const desc = (m.description || '').toLowerCase();
            const catName = m.CashflowCategory?.name || '';

            if (desc.includes('sharekhan') || catName === 'HR-Stocks-Sharekhan') {
                targetAccount = sharekhan;
            } else if (desc.includes('zerodha') || catName === 'HR-Stocks-Zerodha' || catName === 'HR-Shloka Stocks') {
                targetAccount = zerodha;
            }

            if (targetAccount) {
                const existing = await CashflowTransaction.findOne({
                    where: { linkedTransactionId: m.id }
                });

                if (!existing) {
                    let targetType;
                    let debit = 0;
                    let credit = 0;
                    const val = parseFloat(m.amount);

                    if (m.type === 'expense' || m.type === 'transfer_out') {
                        targetType = 'transfer_in';
                        credit = val;
                    } else if (m.type === 'income' || m.type === 'transfer_in') {
                        targetType = 'transfer_out';
                        debit = val;
                    } else {
                        targetType = m.type;
                        if (targetType === 'income') credit = val;
                        else if (targetType === 'expense') debit = val;
                    }

                    await CashflowTransaction.create({
                        AccountId: targetAccount.id,
                        amount: m.amount,
                        debit: debit,
                        credit: credit,
                        transactionDate: m.transactionDate,
                        description: m.description,
                        type: targetType,
                        CashflowCategoryId: m.CashflowCategoryId,
                        linkedTransactionId: m.id,
                        scrip: m.scrip
                    });

                    transferredCount++;
                }
            }
        }
        console.log(`Synced ${transferredCount} transfer/category-matched transactions from ICICI.`);

        // 2. Sync Dividends based on Instrument category
        const dividendTrans = await CashflowTransaction.findAll({
            where: {
                AccountId: icici.id,
                scrip: { [Op.not]: null }
            },
            include: [CashflowCategory]
        });

        let dividendCount = 0;
        for (const m of dividendTrans) {
            if (m.CashflowCategory?.name !== 'Dividend') continue;

            const existing = await CashflowTransaction.findOne({
                where: { linkedTransactionId: m.id }
            });
            if (existing) continue;

            const instrument = await Instrument.findOne({ where: { ticker: m.scrip } });
            if (!instrument) continue;

            let targetAccount = null;
            if (instrument.category === 'conservative') {
                targetAccount = sharekhan;
            } else if (instrument.category === 'aspiration') {
                targetAccount = zerodha;
            }

            if (targetAccount) {
                await CashflowTransaction.create({
                    AccountId: targetAccount.id,
                    amount: m.amount,
                    debit: 0,
                    credit: m.amount,
                    transactionDate: m.transactionDate,
                    description: m.description,
                    type: m.type,
                    CashflowCategoryId: m.CashflowCategoryId,
                    linkedTransactionId: m.id,
                    scrip: m.scrip
                });
                dividendCount++;
            }
        }
        console.log(`Synced ${dividendCount} dividend transactions from ICICI.`);

        // 3. Sync HR-Shloka Stocks from ANY account to Zerodha
        const shlokaCat = await CashflowCategory.findOne({ where: { name: 'HR-Shloka Stocks' } });
        if (shlokaCat) {
            const shlokaTrans = await CashflowTransaction.findAll({
                where: {
                    CashflowCategoryId: shlokaCat.id,
                    AccountId: { [Op.ne]: zerodha.id }
                }
            });

            let shlokaCount = 0;
            for (const m of shlokaTrans) {
                const existing = await CashflowTransaction.findOne({
                    where: { linkedTransactionId: m.id }
                });
                if (!existing) {
                    let debit = 0;
                    let credit = 0;
                    const val = parseFloat(m.amount);
                    let targetType;

                    if (m.type === 'expense' || m.type === 'transfer_out') {
                        targetType = 'transfer_in';
                        credit = val;
                    } else if (m.type === 'income' || m.type === 'transfer_in') {
                        targetType = 'transfer_out';
                        debit = val;
                    } else {
                        targetType = m.type;
                        if (targetType === 'income') credit = val;
                        else if (targetType === 'expense') debit = val;
                    }

                    await CashflowTransaction.create({
                        AccountId: zerodha.id,
                        amount: m.amount,
                        debit: debit,
                        credit: credit,
                        transactionDate: m.transactionDate,
                        description: m.description,
                        type: targetType,
                        CashflowCategoryId: m.CashflowCategoryId,
                        linkedTransactionId: m.id,
                        scrip: m.scrip
                    });
                    shlokaCount++;
                }
            }
            console.log(`Synced ${shlokaCount} HR-Shloka Stocks transactions to Zerodha.`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error syncing records:', error);
        process.exit(1);
    }
}

syncRecords();
