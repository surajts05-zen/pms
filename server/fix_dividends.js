const { CashflowTransaction, CashflowCategory } = require('./models');
const { Op } = require('sequelize');

async function fixDividends() {
    try {
        const dividendCategory = await CashflowCategory.findOne({ where: { name: 'Dividend' } });
        if (!dividendCategory) {
            console.error('Dividend category not found');
            return;
        }

        // 1. Find all potential dividend transactions (already categorized as Dividend or containing 'div' in description)
        const potentialDividends = await CashflowTransaction.findAll({
            where: {
                [Op.or]: [
                    { CashflowCategoryId: dividendCategory.id },
                    {
                        [Op.and]: [
                            { type: 'income' },
                            {
                                [Op.or]: [
                                    { description: { [Op.iLike]: '%dividend%' } },
                                    { description: { [Op.iLike]: '%div %' } },
                                    { description: { [Op.iLike]: '% div %' } }
                                ]
                            }
                        ]
                    }
                ]
            }
        });

        console.log(`Found ${potentialDividends.length} potential dividend entries to process.`);

        let updatedCount = 0;

        for (const txn of potentialDividends) {
            let scrip = txn.scrip;
            let description = txn.description || '';
            let needsUpdate = false;

            // If scrip is null, try to extract it from description
            if (!scrip) {
                // Common pattern: "SCRIPNAME DIVIDEND" or "SCRIPNAME DIV"
                // Example: "HDFCBANK DIVIDEND", "INFY DIV", "RELIANCE"

                // Remove common noise
                let cleanDesc = description.toUpperCase()
                    .replace(/DIVIDEND/g, '')
                    .replace(/DIV/g, '')
                    .replace(/FINAL/g, '')
                    .replace(/INTERIM/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                // If result is alphanumeric and not too long, assume it's the scrip
                if (cleanDesc && cleanDesc.length <= 15 && /^[A-Z0-9.\-]+$/.test(cleanDesc)) {
                    scrip = cleanDesc;
                    needsUpdate = true;
                }
            }

            // Ensure categorization is correct
            if (txn.CashflowCategoryId !== dividendCategory.id) {
                txn.CashflowCategoryId = dividendCategory.id;
                needsUpdate = true;
            }

            if (needsUpdate) {
                await txn.update({
                    scrip: scrip,
                    CashflowCategoryId: txn.CashflowCategoryId
                });
                updatedCount++;
                console.log(`Updated [${txn.transactionDate}]: "${description}" -> Scrip: ${scrip}`);
            }
        }

        console.log(`\nSuccess! Updated ${updatedCount} transactions.`);

    } catch (err) {
        console.error('Error fixing dividends:', err);
    }
}

fixDividends();
