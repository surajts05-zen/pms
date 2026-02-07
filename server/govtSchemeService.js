
const GovtSchemeService = {
    /**
     * Syncs a cashflow transaction to the corresponding Govt Scheme Transaction
     * if the transferAccountId points to a Govt Scheme Account.
     * @param {Object} cashflowTransaction - The transaction instance
     * @param {Object} models - The sequelize models { Account, GovtSchemeTransaction }
     */
    async syncTransaction(cashflowTransaction, models) {
        const { Account, GovtSchemeTransaction } = models;
        try {
            // Check if this is a transfer to a Govt Scheme
            if (!cashflowTransaction.transferAccountId) return;

            const schemeAccount = await Account.findByPk(cashflowTransaction.transferAccountId);
            if (!schemeAccount) return;

            // Check if account type is 'ppf', 'ssy', or 'pf'
            if (!['ppf', 'ssy', 'pf'].includes(schemeAccount.type)) return;

            // Prepare data
            // Transfer Out from Bank = Deposit to Govt Scheme
            // CashflowTransaction: type='transfer_out', debit=amount
            // GovtSchemeTransaction: type='deposit', amount=amount

            // If it's a transfer_in to Bank (Withdrawal from Scheme?), 
            // CashflowTransaction: type='transfer_in', credit=amount, transferAccountId=Scheme
            // GovtSchemeTransaction: type='withdrawal', amount=amount

            let type = 'deposit';
            if (cashflowTransaction.type === 'transfer_in') {
                type = 'withdrawal';
            } else if (cashflowTransaction.type === 'transfer_out') {
                type = 'deposit';
            } else {
                return; // Not a transfer
            }

            const amount = parseFloat(cashflowTransaction.amount);
            const date = cashflowTransaction.transactionDate;
            const description = cashflowTransaction.description;
            const notes = cashflowTransaction.scrip ? `${cashflowTransaction.scrip}` : '';
            const UserId = cashflowTransaction.UserId;

            // Check for existing transaction to avoid duplicates logic
            // We use a composite check: AccountId + Date + Amount + Type

            const existing = await GovtSchemeTransaction.findOne({
                where: {
                    AccountId: schemeAccount.id,
                    transactionDate: date,
                    amount: amount,
                    type: type, // Ensure type matches (deposit/withdrawal)
                    UserId: UserId
                }
            });

            if (existing) {
                // Update if description changed
                if (existing.description !== description || existing.notes !== notes) {
                    existing.description = description;
                    existing.notes = notes;
                    await existing.save();
                    console.log(`Updated Govt Scheme Transaction for ${schemeAccount.name}`);
                }
            } else {
                // Create new
                await GovtSchemeTransaction.create({
                    AccountId: schemeAccount.id,
                    transactionDate: date,
                    amount: amount,
                    type: type,
                    description: description,
                    notes: notes,
                    UserId: UserId
                });
                console.log(`Created Govt Scheme Transaction for ${schemeAccount.name}`);
            }

            // Update Account Balance
            await this.updateAccountBalance(schemeAccount.id, models);

        } catch (error) {
            console.error("Error syncing Govt Scheme Transaction:", error);
        }
    },

    /**
     * Handles deletion of cashflow transaction
     */
    async handleDeletion(cashflowTransaction, models) {
        const { Account, GovtSchemeTransaction } = models;
        try {
            if (!cashflowTransaction.transferAccountId) return;

            const schemeAccount = await Account.findByPk(cashflowTransaction.transferAccountId);
            if (!schemeAccount || !['ppf', 'ssy', 'pf'].includes(schemeAccount.type)) return;

            let type = 'deposit';
            if (cashflowTransaction.type === 'transfer_in') {
                type = 'withdrawal';
            } else if (cashflowTransaction.type === 'transfer_out') {
                type = 'deposit';
            }

            // Find match and delete
            const govtTxn = await GovtSchemeTransaction.findOne({
                where: {
                    AccountId: schemeAccount.id,
                    transactionDate: cashflowTransaction.transactionDate,
                    amount: cashflowTransaction.amount,
                    type: type,
                    UserId: cashflowTransaction.UserId
                }
            });

            if (govtTxn) {
                await govtTxn.destroy();
                console.log(`Deleted Govt Scheme Transaction for ${schemeAccount.name}`);

                // Update Account Balance
                await this.updateAccountBalance(schemeAccount.id, models);
            }

        } catch (error) {
            console.error("Error handling Govt Scheme Deletion:", error);
        }
    },

    /**
     * Detects if a transaction description matches a Govt Scheme and sets transferAccountId
     */
    async detectSchemeTransfer(transaction, models) {
        const { Account } = models;
        if (transaction.transferAccountId) return; // Already set

        const description = transaction.description || '';
        let targetType = null;

        // Simple keyword matching with word boundaries to avoid false positives (e.g. DaH(SSA)ult)
        if (/\bSSA\b/i.test(description)) targetType = 'ssy';
        else if (/\bPPF\b/i.test(description)) targetType = 'ppf';
        else if (/(EPF|Provident Fund)/i.test(description)) targetType = 'pf';

        if (targetType) {
            // Find the user's account of this type
            const account = await Account.findOne({
                where: {
                    type: targetType,
                    UserId: transaction.UserId
                }
            });

            if (account) {
                transaction.transferAccountId = account.id;
                // Auto-correct type if it's currently expense
                if (transaction.type === 'expense') {
                    transaction.type = 'transfer_out';
                }
                console.log(`Auto-detected transfer to ${targetType}: ${account.name}`);
            }
        }
    },

    /**
     * Recalculates and updates the balance for a Govt Scheme Account
     */
    async updateAccountBalance(accountId, models) {
        const { Account, GovtSchemeTransaction } = models;
        try {
            const txs = await GovtSchemeTransaction.findAll({
                where: { AccountId: accountId }
            });

            let balance = 0;
            txs.forEach(t => {
                const amt = parseFloat(t.amount);
                if (t.type === 'deposit' || t.type === 'interest') {
                    balance += amt;
                } else if (t.type === 'withdrawal') {
                    balance -= amt;
                }
            });

            await Account.update({ balance }, { where: { id: accountId } });
            console.log(`Updated balance for Account ${accountId} to ${balance}`);
        } catch (error) {
            console.error("Error updating account balance:", error);
        }
    }
};

module.exports = GovtSchemeService;
