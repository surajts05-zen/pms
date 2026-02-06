const { Account, InstrumentInterestRate, sequelize } = require('./models');

async function initPF() {
    const UserId = 'a18b80a4-9e20-46cd-854e-708ab2c11ed7';

    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // 1. Create PF Account if it doesn't exist
        const [account, created] = await Account.findOrCreate({
            where: {
                type: 'pf',
                UserId: UserId
            },
            defaults: {
                name: 'Provident Fund (EPF)',
                institution: 'EPFO',
                balance: 0,
                openingBalance: 0,
                openingBalanceDate: '2021-04-01'
            }
        });

        if (created) {
            console.log('Created PF Account');
        } else {
            console.log('PF Account already exists');
        }

        // 2. Add Historical Interest Rates
        const rates = [
            { instrumentType: 'pf', rate: 8.50, effectiveFrom: '2020-04-01', effectiveTo: '2021-03-31' },
            { instrumentType: 'pf', rate: 8.10, effectiveFrom: '2021-04-01', effectiveTo: '2022-03-31' },
            { instrumentType: 'pf', rate: 8.15, effectiveFrom: '2022-04-01', effectiveTo: '2023-03-31' },
            { instrumentType: 'pf', rate: 8.25, effectiveFrom: '2023-04-01', effectiveTo: '2024-03-31' },
            { instrumentType: 'pf', rate: 8.25, effectiveFrom: '2024-04-01', effectiveTo: '2025-03-31' },
            { instrumentType: 'pf', rate: 8.25, effectiveFrom: '2025-04-01', effectiveTo: '2026-03-31' }
        ];

        for (const rateData of rates) {
            await InstrumentInterestRate.findOrCreate({
                where: {
                    instrumentType: rateData.instrumentType,
                    effectiveFrom: rateData.effectiveFrom,
                    UserId: UserId
                },
                defaults: rateData
            });
        }
        console.log('PF Interest Rates initialized');

    } catch (error) {
        console.error('Error during PF initialization:', error);
    } finally {
        await sequelize.close();
    }
}

initPF();
