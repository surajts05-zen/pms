const {
    sequelize, User, Account, Instrument, Transaction,
    CashflowCategory, CashflowTransaction, FixedDeposit,
    LedgerAccount, JournalEntry, LedgerPosting
} = require('./models');

async function migrate() {
    try {
        const user = await User.findOne({ where: { email: 'surajss@gmail.com' } });
        if (!user) {
            console.error('User surajss@gmail.com not found');
            return;
        }
        const userId = user.id;
        console.log('Migrating data for user:', userId);

        const models = [
            Account, Instrument, Transaction,
            CashflowCategory, CashflowTransaction, FixedDeposit,
            LedgerAccount, JournalEntry, LedgerPosting
        ];

        for (const model of models) {
            console.log(`Updating ${model.name}...`);
            // We use raw query because sync hasn't happened yet, so model attributes might not match DB exactly
            // Actually, if we use allowNull: true in models temporarily, we can use the model.
            // But let's use raw queries to be safe and bypass constraints.
            try {
                await sequelize.query(`UPDATE "${model.tableName}" SET "UserId" = :userId WHERE "UserId" IS NULL`, {
                    replacements: { userId },
                    type: sequelize.QueryTypes.UPDATE
                });
            } catch (e) {
                console.log(`Could not update ${model.name}: ${e.message}`);
                // Maybe the column doesn't exist yet? If so, we need sync to add it first with allowNull: true
            }
        }

        console.log('Migration attempt finished');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
