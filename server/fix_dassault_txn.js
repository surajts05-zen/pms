
const { sequelize, Account, GovtSchemeTransaction, CashflowTransaction, CashflowCategory } = require('./models');
const GovtSchemeService = require('./govtSchemeService');

async function fixTransaction() {
    try {
        console.log('Starting Fix...');

        // 1. Find the misclassified Govt Scheme Transaction
        // Note: Using 'like' because of potential whitespace differences
        const govtTxns = await GovtSchemeTransaction.findAll({
            where: {
                notes: { [sequelize.Sequelize.Op.like]: '%Metro to Jayanagar%' }
            }
        });

        if (govtTxns.length === 0) {
            console.log('No Govt Scheme Transaction found matching "Metro to Jayanagar". It might have been deleted or description differs.');
            // Try description
            const govtTxnsDesc = await GovtSchemeTransaction.findAll({
                where: {
                    description: { [sequelize.Sequelize.Op.like]: '%Metro to Jayanagar%' }
                }
            });
            if (govtTxnsDesc.length === 0) {
                console.log('No transaction found by description either.');
                return;
            }
            govtTxns.push(...govtTxnsDesc);
        }

        const targetTxn = govtTxns[0];
        console.log('Found Govt Scheme Transaction:', targetTxn.id, targetTxn.amount, targetTxn.transactionDate);

        // 2. Find the corresponding Cashflow Transaction
        const cashflowTxn = await CashflowTransaction.findOne({
            where: {
                transactionDate: targetTxn.transactionDate,
                amount: targetTxn.amount,
                UserId: targetTxn.UserId,
                // It should have the SSY account as transferAccountId
                transferAccountId: targetTxn.AccountId
            }
        });

        if (!cashflowTxn) {
            console.log('Could not find corresponding Cashflow Transaction.');
            // Fallback: search by description
            const cashflowTxnDesc = await CashflowTransaction.findOne({
                where: {
                    description: { [sequelize.Sequelize.Op.like]: '%Metro to Jayanagar%' },
                    transactionDate: targetTxn.transactionDate
                }
            });
            if (cashflowTxnDesc) {
                console.log('Found Cashflow Transaction by description:', cashflowTxnDesc.id);
                // Proceed with this one
                await updateCashflow(cashflowTxnDesc, targetTxn);
            } else {
                console.log('Aborting fix.');
            }
        } else {
            console.log('Found Cashflow Transaction:', cashflowTxn.id);
            await updateCashflow(cashflowTxn, targetTxn);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

async function updateCashflow(cashflowTxn, govtTxn) {
    // 3. Find Transport Category
    const transportCat = await CashflowCategory.findOne({
        where: {
            name: { [sequelize.Sequelize.Op.like]: '%Transport%' },
            type: 'expense'
        }
    });

    // 4. Update Cashflow Transaction
    // Remove link to SSY account
    cashflowTxn.transferAccountId = null;
    cashflowTxn.type = 'expense'; // It was likely 'transfer_out'

    if (transportCat) {
        console.log('Assigning to Category:', transportCat.name);
        cashflowTxn.CashflowCategoryId = transportCat.id; // Correct matching FK is likely CashflowCategoryId based on belongsTo
        // Note: Models definition: CashflowTransaction.belongsTo(CashflowCategory, { foreignKey: { allowNull: true } });
        // Default FK name is CashflowCategoryId unless specified.
    } else {
        console.log('No Transport category found. Leaving uncategorized.');
    }

    await cashflowTxn.save();
    console.log('Updated Cashflow Transaction.');

    // 5. Delete Govt Scheme Transaction
    const accountId = govtTxn.AccountId;
    await govtTxn.destroy();
    console.log('Deleted misclassified Govt Scheme Transaction.');

    // 6. Recalculate Balance for the SSY Account
    await GovtSchemeService.updateAccountBalance(accountId, { Account, GovtSchemeTransaction });
    console.log('Recalculated SSY Account Balance.');
}

fixTransaction();
