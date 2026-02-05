const XLSX = require('xlsx');
const path = require('path');
const { Account, CashflowTransaction, CashflowCategory, sequelize } = require('./models');

async function importCashflowData() {
    try {
        // Read the Excel file
        const excelPath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');
        console.log('Reading Excel file from:', excelPath);

        const workbook = XLSX.readFile(excelPath);
        console.log('Available sheets:', workbook.SheetNames);

        // Process sheets 1-12 (tabs 1-12)
        const accountsToCreate = [];
        const transactionsToImport = [];

        for (let i = 0; i < 12 && i < workbook.SheetNames.length; i++) {
            const sheetName = workbook.SheetNames[i];
            console.log(`\n--- Processing Sheet ${i + 1}: ${sheetName} ---`);

            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            // Print first few rows to understand structure
            console.log('First 5 rows:');
            data.slice(0, 5).forEach((row, idx) => {
                console.log(`Row ${idx}:`, row);
            });

            // Extract account information from the sheet name or header
            // This will depend on the actual structure of your Excel file
            // For now, let's create accounts based on sheet names

            const accountName = sheetName.trim();

            // Check if this looks like a bank account sheet
            if (accountName && !accountName.toLowerCase().includes('summary') && !accountName.toLowerCase().includes('consolidated')) {
                accountsToCreate.push({
                    name: accountName,
                    type: 'bank',
                    institution: extractInstitutionName(accountName),
                    balance: 0
                });
            }

            // Parse transactions for April 2025
            // Find the April 2025 column and extract data
            const aprilTransactions = parseAprilTransactions(data, accountName, i);
            transactionsToImport.push(...aprilTransactions);
        }

        console.log('\n=== Summary ===');
        console.log('Accounts to create:', accountsToCreate.length);
        console.log('Transactions for April 2025:', transactionsToImport.length);

        // Display accounts that will be created
        console.log('\n=== Accounts to be created ===');
        accountsToCreate.forEach((acc, idx) => {
            console.log(`${idx + 1}. ${acc.name} (${acc.institution || 'N/A'})`);
        });

        // Ask for confirmation
        console.log('\n=== Next Steps ===');
        console.log('Review the data above. To proceed with import:');
        console.log('1. Update this script with the correct Excel structure parsing logic');
        console.log('2. Run the import by calling importAccounts() and importTransactions()');

        return { accountsToCreate, transactionsToImport };

    } catch (error) {
        console.error('Error importing data:', error);
        throw error;
    }
}

function extractInstitutionName(accountName) {
    // Extract institution name from account name
    // Examples: "HDFC Bank" -> "HDFC Bank", "SBI Savings" -> "SBI"
    const bankNames = ['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'Bank of Baroda', 'PNB', 'Canara', 'Union Bank', 'IDBI', 'Yes Bank', 'IndusInd'];

    for (const bank of bankNames) {
        if (accountName.includes(bank)) {
            return bank;
        }
    }

    return accountName.split(' ')[0]; // Return first word as institution
}

function parseAprilTransactions(data, accountName, sheetIndex) {
    // This function needs to be customized based on the actual Excel structure
    // For now, return empty array - will be updated after examining the Excel structure
    const transactions = [];

    // TODO: Parse the Excel structure to extract April 2025 transactions
    // Expected format might be:
    // - Rows: Categories/Items
    // - Columns: Months (with April 2025 being one of them)

    return transactions;
}

async function createAccounts(accountsData) {
    console.log('\n=== Creating Accounts ===');

    for (const accData of accountsData) {
        try {
            // Check if account already exists
            const existing = await Account.findOne({ where: { name: accData.name } });

            if (existing) {
                console.log(`Account "${accData.name}" already exists. Skipping.`);
            } else {
                const account = await Account.create(accData);
                console.log(`✓ Created account: ${account.name} (ID: ${account.id})`);
            }
        } catch (error) {
            console.error(`✗ Failed to create account "${accData.name}":`, error.message);
        }
    }
}

async function importTransactions(transactionsData) {
    console.log('\n=== Importing Transactions ===');

    for (const txnData of transactionsData) {
        try {
            const transaction = await CashflowTransaction.create(txnData);
            console.log(`✓ Created transaction: ${transaction.description} (${transaction.amount})`);
        } catch (error) {
            console.error(`✗ Failed to create transaction:`, error.message);
        }
    }
}

// Main execution
async function main() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');

        const { accountsToCreate, transactionsToImport } = await importCashflowData();

        // Uncomment the following lines after reviewing the data structure:
        // await createAccounts(accountsToCreate);
        // await importTransactions(transactionsToImport);

        console.log('\n=== Import process completed ===');
        process.exit(0);

    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { importCashflowData, createAccounts, importTransactions };
