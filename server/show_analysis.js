const fs = require('fs');

const data = JSON.parse(fs.readFileSync('excel_analysis.json', 'utf8'));

console.log('=== EXCEL ANALYSIS ===');
console.log('Total Sheets:', data.totalSheets);
console.log('\n=== ALL SHEET NAMES ===');

data.sheets.forEach((sheet) => {
    console.log(`${sheet.index}. ${sheet.name} (${sheet.rows} rows)`);
});

console.log('\n=== FIRST SHEET STRUCTURE (Apr 2025) ===');
const firstSheet = data.sheets[0];
if (firstSheet && firstSheet.sampleData) {
    console.log('\nFirst 10 rows:');
    firstSheet.sampleData.forEach((row, idx) => {
        console.log(`Row ${idx}:`, JSON.stringify(row).substring(0, 150));
    });
}
