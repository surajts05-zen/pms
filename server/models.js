const { DataTypes } = require('sequelize');
const sequelize = require('./db');

const Account = sequelize.define('Account', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('bank', 'demat', 'pf', 'cash', 'creditcard', 'loan', 'ppf', 'ssy'),
        allowNull: false,
    },
    institution: {
        type: DataTypes.STRING,
    },
    accountNumber: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    balance: {
        type: DataTypes.DECIMAL(20, 4),
        defaultValue: 0,
    },
    isFamily: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    isArchived: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    displayOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    openingBalance: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
    },
    openingBalanceDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    UserId: {
        type: DataTypes.UUID,
        allowNull: false
    }
});

const Instrument = sequelize.define('Instrument', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    ticker: {
        type: DataTypes.STRING,
        unique: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    category: {
        type: DataTypes.ENUM('conservative', 'aspiration', 'safe'),
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('stock', 'etf', 'fd', 'cash', 'mf'),
        allowNull: false,
    },
    UserId: {
        type: DataTypes.UUID,
        allowNull: true // Allow shared instruments or user-specific ones
    }
});

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    type: {
        type: DataTypes.ENUM('buy', 'sell', 'transfer_in', 'transfer_out', 'dividend', 'split', 'bonus', 'deposit', 'withdrawal', 'demerger', 'resulting'),
        allowNull: false,
    },
    transactionDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    quantity: {
        type: DataTypes.DECIMAL(20, 4),
        allowNull: false,
    },
    price: {
        type: DataTypes.DECIMAL(20, 4),
        allowNull: false,
    },
    fees: {
        type: DataTypes.DECIMAL(20, 4),
        defaultValue: 0,
    },
    notes: {
        type: DataTypes.TEXT,
    },
    UserId: {
        type: DataTypes.UUID,
        allowNull: false
    }
});

const PriceHistory = sequelize.define('PriceHistory', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    priceDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    closePrice: {
        type: DataTypes.DECIMAL(20, 4),
        allowNull: false,
    }
});

const CashflowCategory = sequelize.define('CashflowCategory', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('income', 'expense'),
        allowNull: false,
    },
    parentCategory: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    isInvestment: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    displayOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    UserId: {
        type: DataTypes.UUID,
        allowNull: false
    }
});

const CashflowTransaction = sequelize.define('CashflowTransaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    amount: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
    },
    debit: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
    },
    credit: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
    },
    transactionDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    type: {
        type: DataTypes.ENUM('income', 'expense', 'transfer', 'transfer_in', 'transfer_out'),
        allowNull: false,
    },
    transferAccountId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Accounts',
            key: 'id'
        }
    },
    linkedTransactionId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    scrip: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    UserId: {
        type: DataTypes.UUID,
        allowNull: false
    }
});

const FixedDeposit = sequelize.define('FixedDeposit', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    bankName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    accountNumber: {
        type: DataTypes.STRING,
    },
    principalAmount: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
    },
    interestRate: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    maturityDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    maturityAmount: {
        type: DataTypes.DECIMAL(20, 2),
        allowNull: false,
    },
    autoRenew: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    remarks: {
        type: DataTypes.STRING,
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'REDEEMED'),
        defaultValue: 'ACTIVE'
    },
    compoundingFrequency: {
        type: DataTypes.ENUM('Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'),
        defaultValue: 'Quarterly'
    },
    // Linkage to cashflow transaction (when money left bank account)
    cashflowTransactionId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    // Linkage to accounting journal entry
    journalEntryId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    // Source bank account (for accounting)
    sourceAccountId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    UserId: {
        type: DataTypes.UUID,
        allowNull: false
    }
});

const LedgerAccount = sequelize.define('LedgerAccount', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('Asset', 'Liability', 'Equity', 'Revenue', 'Expense'),
        allowNull: false,
    },
    subType: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    parentId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    linkedId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    linkedType: {
        type: DataTypes.STRING, // 'Account', 'CashflowCategory'
        allowNull: true,
    },
    UserId: {
        type: DataTypes.UUID,
        allowNull: false
    }
});

const JournalEntry = sequelize.define('JournalEntry', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    transactionDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    referenceId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    referenceType: {
        type: DataTypes.STRING, // 'CashflowTransaction', 'StockBuy', etc.
        allowNull: true,
    },
    UserId: {
        type: DataTypes.UUID,
        allowNull: false
    }
});

const LedgerPosting = sequelize.define('LedgerPosting', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    debit: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
    },
    credit: {
        type: DataTypes.DECIMAL(20, 2),
        defaultValue: 0,
    },
    UserId: {
        type: DataTypes.UUID,
        allowNull: false
    }
});

const InstrumentInterestRate = sequelize.define('InstrumentInterestRate', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    instrumentType: {
        type: DataTypes.STRING, // 'pf', 'ppf', 'ssy'
        allowNull: false,
    },
    rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    effectiveFrom: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    effectiveTo: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    UserId: {
        type: DataTypes.UUID,
        allowNull: false
    }
});

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true, // Null for Google SSO users
    },
    googleId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    twoFactorSecret: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isTwoFactorEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    theme: {
        type: DataTypes.STRING,
        defaultValue: 'dark', // 'dark' or 'light'
    }
});

const GovtSchemeTransaction = sequelize.define('GovtSchemeTransaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    transactionDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    notes: {
        type: DataTypes.STRING,
        allowNull: true
    },
    amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('deposit', 'withdrawal', 'interest'),
        allowNull: false
    },
    UserId: {
        type: DataTypes.UUID,
        allowNull: false
    }
}, {
    timestamps: true
});

// Relationships
Account.hasMany(Transaction);
Transaction.belongsTo(Account);

Instrument.hasMany(Transaction);
Transaction.belongsTo(Instrument);

Instrument.hasMany(PriceHistory);
PriceHistory.belongsTo(Instrument);

// Cashflow Relationships
Account.hasMany(CashflowTransaction);
CashflowTransaction.belongsTo(Account);

CashflowCategory.hasMany(CashflowTransaction);
CashflowTransaction.belongsTo(CashflowCategory, { foreignKey: { allowNull: true } });

// Accounting Relationships
LedgerAccount.hasMany(LedgerAccount, { as: 'SubAccounts', foreignKey: 'parentId' });
LedgerAccount.belongsTo(LedgerAccount, { as: 'ParentAccount', foreignKey: 'parentId' });

JournalEntry.hasMany(LedgerPosting, { foreignKey: 'journalEntryId' });
LedgerPosting.belongsTo(JournalEntry, { foreignKey: 'journalEntryId' });

LedgerAccount.hasMany(LedgerPosting, { foreignKey: 'ledgerAccountId' });
LedgerPosting.belongsTo(LedgerAccount, { foreignKey: 'ledgerAccountId' });

// Govt Scheme Relationships
Account.hasMany(GovtSchemeTransaction);
GovtSchemeTransaction.belongsTo(Account);

User.hasMany(Account);
User.hasMany(Instrument);
User.hasMany(Transaction);
User.hasMany(CashflowCategory);
User.hasMany(CashflowTransaction);
User.hasMany(FixedDeposit);
User.hasMany(LedgerAccount);
User.hasMany(JournalEntry);
User.hasMany(LedgerPosting);
User.hasMany(InstrumentInterestRate);
User.hasMany(GovtSchemeTransaction);

Account.belongsTo(User);
Instrument.belongsTo(User);
Transaction.belongsTo(User);
CashflowCategory.belongsTo(User);
CashflowTransaction.belongsTo(User);
FixedDeposit.belongsTo(User);
LedgerAccount.belongsTo(User);
JournalEntry.belongsTo(User);
LedgerPosting.belongsTo(User);
InstrumentInterestRate.belongsTo(User);
GovtSchemeTransaction.belongsTo(User);

module.exports = {
    User,
    Account,
    Instrument,
    Transaction,
    PriceHistory,
    FixedDeposit,
    CashflowCategory,
    CashflowTransaction,
    LedgerAccount,
    JournalEntry,
    LedgerPosting,
    InstrumentInterestRate,
    GovtSchemeTransaction,
    sequelize
};

// Hooks for Govt Scheme Synchronization
const GovtSchemeService = require('./govtSchemeService');

CashflowTransaction.beforeCreate(async (transaction, options) => {
    await GovtSchemeService.detectSchemeTransfer(transaction, { Account });
});

CashflowTransaction.beforeUpdate(async (transaction, options) => {
    await GovtSchemeService.detectSchemeTransfer(transaction, { Account });
});

CashflowTransaction.afterCreate(async (transaction, options) => {
    await GovtSchemeService.syncTransaction(transaction, { Account, GovtSchemeTransaction });
});

CashflowTransaction.afterUpdate(async (transaction, options) => {
    await GovtSchemeService.syncTransaction(transaction, { Account, GovtSchemeTransaction });
});

CashflowTransaction.afterDestroy(async (transaction, options) => {
    await GovtSchemeService.handleDeletion(transaction, { Account, GovtSchemeTransaction });
});
