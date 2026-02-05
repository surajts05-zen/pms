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
        type: DataTypes.ENUM('bank', 'demat', 'pf', 'cash', 'creditcard', 'loan'),
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
    }
});

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    type: {
        type: DataTypes.ENUM('buy', 'sell', 'transfer_in', 'transfer_out', 'dividend', 'split', 'bonus', 'deposit', 'withdrawal'),
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
    displayOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
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
    }
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

module.exports = { Account, Instrument, Transaction, PriceHistory, FixedDeposit, CashflowCategory, CashflowTransaction, sequelize };
