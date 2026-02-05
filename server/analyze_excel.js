const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { Account, CashflowTransaction, CashflowCategory, sequelize } = require('./models');

async function analyzeExcelStructure() {
    try {
        // Read the Excel file
        const excelPath = path.join(__dirname, '..', '2025-26 Cash Flow Statement - Monthly.xlsx');
        console.log('Reading Excel file from:', excelPath);

        const workbook = XLSX.readFile(excelPath);
        const analysis = {
            totalSheets: workbook.SheetNames.length,
            sheets: []
        };

        // Analyze first 12 sheets
        for (let i = 0; i < 12 && i < workbook.SheetNames.length; i++) {
            const sheetName = workbook.SheetNames[i];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            const sheetInfo = {
                index: i + 1,
                name: sheetName,
                rows: data.length,
                firstRow: data[0] || [],
                secondRow: data[1] || [],
                thirdRow: data[2] || [],
                sampleData: data.slice(0, 10)
            };

            analysis.sheets.push(sheetInfo);
        }

        // Write analysis to file
        fs.writeFileSync('excel_analysis.json', JSON.stringify(analysis, null, 2));
        console.log('\n✓ Analysis written to excel_analysis.json');
        console.log('\nTotal sheets found:', analysis.totalSheets);
        console.log('Sheet names (1-12):');
        analysis.sheets.forEach(s => {
            console.log(`  ${s.index}. ${s.name} (${s.rows} rows)`);
        });

        return analysis;

    } catch (error) {
        console.error('Error analyzing Excel:', error);
        throw error;
    }
}

// Main execution
async function main() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.\n');

        await analyzeExcelStructure();

        console.log('\n✓ Complete! Check excel_analysis.json for detailed structure.');
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
