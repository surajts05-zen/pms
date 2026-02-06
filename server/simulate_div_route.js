const { CashflowCategory, CashflowTransaction, Account } = require('./models');
const { Op } = require('sequelize');
const sequelize = require('./db');
const fs = require('fs');

async function simulateSummary() {
    try {
        const dividendCategory = await CashflowCategory.findOne({
            where: { name: 'Dividend', type: 'income' }
        });

        if (!dividendCategory) {
            console.log('Dividend Category NOT found matching { name: "Dividend", type: "income" }');
            // Try finding just by name
            const catByName = await CashflowCategory.findOne({ where: { name: 'Dividend' } });
            console.log('Category found by name only:', catByName ? JSON.stringify(catByName.toJSON()) : 'None');
            return;
        }

        console.log('Dividend Category found:', JSON.stringify(dividendCategory.toJSON()));

        const transactions = await CashflowTransaction.findAll({
            where: {
                CashflowCategoryId: dividendCategory.id,
                type: 'income'
            },
            include: [
                { model: Account },
                { model: CashflowCategory }
            ],
            order: [['transactionDate', 'DESC']],
            limit: 5
        });

        console.log(`Found ${transactions.length} transactions in simulated summary query.`);
        if (transactions.length > 0) {
            console.log('Sample:', JSON.stringify(transactions[0].toJSON(), null, 2));
        } else {
            const count = await CashflowTransaction.count({ where: { CashflowCategoryId: dividendCategory.id } });
            console.log(`However, total count by ID is ${count}`);
        }

    } catch (err) {
        console.error(err);
    }
}

simulateSummary();
