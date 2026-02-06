const { JournalEntry, LedgerPosting, LedgerAccount, sequelize } = require('./models');

const AccountingService = {
    /**
     * Map a CashflowTransaction to a Journal Entry and Ledger Postings.
     * @param {Object} transaction - Sequelize model instance of CashflowTransaction
     */
    async processCashflowTransaction(transaction) {
        const t = await sequelize.transaction();
        try {
            // 1. Create Journal Entry
            const journal = await JournalEntry.create({
                transactionDate: transaction.transactionDate,
                description: transaction.description || `Transaction ${transaction.id}`,
                referenceId: transaction.id,
                referenceType: 'CashflowTransaction',
                UserId: transaction.UserId
            }, { transaction: t });

            // 2. Find Ledger Accounts
            const assetLedger = await LedgerAccount.findOne({
                where: { linkedId: transaction.AccountId, linkedType: 'Account', UserId: transaction.UserId }
            });

            // For Income/Expense, the second account is a Category
            // For Transfers, it's another LedgerAccount (Account)
            let otherLedger;
            if (transaction.CashflowCategoryId) {
                otherLedger = await LedgerAccount.findOne({
                    where: { linkedId: transaction.CashflowCategoryId, linkedType: 'CashflowCategory', UserId: transaction.UserId }
                });
            } else if (transaction.transferAccountId) {
                otherLedger = await LedgerAccount.findOne({
                    where: { linkedId: transaction.transferAccountId, linkedType: 'Account', UserId: transaction.UserId }
                });
            }

            if (!assetLedger || !otherLedger) {
                console.warn(`Ledger mapping missing for transaction ${transaction.id}. Asset: ${!!assetLedger}, Other: ${!!otherLedger}`);
                await t.rollback();
                return;
            }

            // 3. Create Postings based on type
            const amount = parseFloat(transaction.debit) || parseFloat(transaction.credit) || parseFloat(transaction.amount) || 0;


            if (transaction.type === 'income' || transaction.type === 'transfer_in') {
                // Debit Asset (Inflow)
                await LedgerPosting.create({
                    journalEntryId: journal.id,
                    ledgerAccountId: assetLedger.id,
                    debit: amount,
                    credit: 0,
                    UserId: transaction.UserId
                }, { transaction: t });

                // Credit Revenue or Source Asset
                await LedgerPosting.create({
                    journalEntryId: journal.id,
                    ledgerAccountId: otherLedger.id,
                    debit: 0,
                    credit: amount,
                    UserId: transaction.UserId
                }, { transaction: t });
            } else {
                // Credit Asset (Outflow)
                await LedgerPosting.create({
                    journalEntryId: journal.id,
                    ledgerAccountId: assetLedger.id,
                    debit: 0,
                    credit: amount,
                    UserId: transaction.UserId
                }, { transaction: t });

                // Debit Expense or Destination Asset
                await LedgerPosting.create({
                    journalEntryId: journal.id,
                    ledgerAccountId: otherLedger.id,
                    debit: amount,
                    credit: 0,
                    UserId: transaction.UserId
                }, { transaction: t });
            }

            await t.commit();
            console.log(`Successfully recorded journal for transaction ${transaction.id}`);
        } catch (error) {
            await t.rollback();
            console.error(`Failed to process cashflow transaction ${transaction.id}:`, error);
            throw error;
        }
    },

    /**
     * Standalone example for recording a Stock Buy.
     * This demonstrates the 'Demat' and 'Bank' mapping.
     */
    async recordStockBuyExample(data) {
        // Mock data structure: { date, scrip, quantity, price, fees, bankAccountId, dematAccountId, UserId }
        const totalCost = (data.quantity * data.price) + (data.fees || 0);

        const t = await sequelize.transaction();
        try {
            const journal = await JournalEntry.create({
                transactionDate: data.date,
                description: `Purchase of ${data.quantity} units of ${data.scrip}`,
                referenceType: 'StockBuy',
                UserId: data.UserId
            }, { transaction: t });

            // Debit Investment Asset (Demat)
            const dematLedger = await LedgerAccount.findOne({
                where: { linkedId: data.dematAccountId, linkedType: 'Account', UserId: data.UserId }
            });

            // Credit Cash Asset (Bank)
            const bankLedger = await LedgerAccount.findOne({
                where: { linkedId: data.bankAccountId, linkedType: 'Account', UserId: data.UserId }
            });

            if (dematLedger && bankLedger) {
                await LedgerPosting.create({
                    journalEntryId: journal.id,
                    ledgerAccountId: dematLedger.id,
                    debit: totalCost,
                    credit: 0,
                    UserId: data.UserId
                }, { transaction: t });

                await LedgerPosting.create({
                    journalEntryId: journal.id,
                    ledgerAccountId: bankLedger.id,
                    debit: 0,
                    credit: totalCost,
                    UserId: data.UserId
                }, { transaction: t });
            }

            await t.commit();
            return journal;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    }
};

module.exports = AccountingService;
