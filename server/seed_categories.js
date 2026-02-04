const { CashflowCategory, sequelize } = require('./models');

const defaultCategories = [
    // Income Categories
    { name: 'Salary', type: 'income', parentCategory: null, displayOrder: 1 },
    { name: 'Bonus', type: 'income', parentCategory: null, displayOrder: 2 },
    { name: 'Interest', type: 'income', parentCategory: null, displayOrder: 3 },
    { name: 'Dividend', type: 'income', parentCategory: null, displayOrder: 4 },
    { name: 'Capital Gains', type: 'income', parentCategory: null, displayOrder: 5 },
    { name: 'Rental Income', type: 'income', parentCategory: null, displayOrder: 6 },
    { name: 'Other Income', type: 'income', parentCategory: null, displayOrder: 7 },

    // Expense Categories
    { name: 'Rent', type: 'expense', parentCategory: 'Housing', displayOrder: 1 },
    { name: 'Utilities', type: 'expense', parentCategory: 'Housing', displayOrder: 2 },
    { name: 'Maintenance', type: 'expense', parentCategory: 'Housing', displayOrder: 3 },
    { name: 'Groceries', type: 'expense', parentCategory: 'Food', displayOrder: 4 },
    { name: 'Dining Out', type: 'expense', parentCategory: 'Food', displayOrder: 5 },
    { name: 'Transport', type: 'expense', parentCategory: 'Transportation', displayOrder: 6 },
    { name: 'Fuel', type: 'expense', parentCategory: 'Transportation', displayOrder: 7 },
    { name: 'Vehicle Maintenance', type: 'expense', parentCategory: 'Transportation', displayOrder: 8 },
    { name: 'Entertainment', type: 'expense', parentCategory: 'Lifestyle', displayOrder: 9 },
    { name: 'Shopping', type: 'expense', parentCategory: 'Lifestyle', displayOrder: 10 },
    { name: 'Healthcare', type: 'expense', parentCategory: 'Healthcare', displayOrder: 11 },
    { name: 'Insurance', type: 'expense', parentCategory: 'Insurance', displayOrder: 12 },
    { name: 'Education', type: 'expense', parentCategory: 'Education', displayOrder: 13 },
    { name: 'Donation', type: 'expense', parentCategory: 'Charity', displayOrder: 14 },
    { name: 'Investment', type: 'expense', parentCategory: 'Savings', displayOrder: 15 },
    { name: 'Loan Payment', type: 'expense', parentCategory: 'Debt', displayOrder: 16 },
    { name: 'Taxes', type: 'expense', parentCategory: 'Taxes', displayOrder: 17 },
    { name: 'Other Expenses', type: 'expense', parentCategory: null, displayOrder: 18 },
];

async function seedCategories() {
    try {
        await sequelize.sync({ alter: true });
        console.log('Database synced');

        // Check if categories already exist
        const existingCount = await CashflowCategory.count();
        if (existingCount > 0) {
            console.log(`Categories already seeded (${existingCount} categories found)`);
            return;
        }

        // Create categories
        await CashflowCategory.bulkCreate(defaultCategories);
        console.log(`Successfully seeded ${defaultCategories.length} categories`);

        const incomeCount = defaultCategories.filter(c => c.type === 'income').length;
        const expenseCount = defaultCategories.filter(c => c.type === 'expense').length;
        console.log(`  - ${incomeCount} income categories`);
        console.log(`  - ${expenseCount} expense categories`);

    } catch (error) {
        console.error('Error seeding categories:', error.message);
    } finally {
        await sequelize.close();
    }
}

seedCategories();
