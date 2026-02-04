const { Instrument, sequelize } = require('./models');

const conservativeScrips = [
    'ASTRAL', 'BAJFINANCE', 'BHARTIARTL', 'GODREJCP', 'GOKEX', 'GOLDBEES',
    'HAVELLS', 'HDBFS', 'HDFCBANK', 'HINDUNILVR', 'INFRABEES', 'ITC',
    'ITCHOTELS', 'LT', 'MAFANG', 'MID150BEES', 'MON100', 'NIFTYBEES',
    'PAGEIND', 'RELAXO', 'SILVERBEES', 'TATACONSUM', 'TCS', 'TITAN',
    'TMCV', 'TMPV'
];

async function updateCategories() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        // Set all to aspiration first (default state)
        await Instrument.update({ category: 'aspiration' }, { where: {} });
        console.log('Reset all to aspiration.');

        // Update conservative ones
        for (const scrip of conservativeScrips) {
            await Instrument.update(
                { category: 'conservative' },
                { where: { name: scrip } }
            );
        }
        console.log('Updated conservative scrips.');

        const counts = await Instrument.findAll({
            attributes: ['category', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: 'category'
        });
        console.log('New Category Counts:', JSON.stringify(counts, null, 2));

    } catch (error) {
        console.error('Update failed:', error);
    } finally {
        await sequelize.close();
    }
}

updateCategories();
