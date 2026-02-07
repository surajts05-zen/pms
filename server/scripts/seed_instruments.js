const { sequelize, Instrument } = require('../models');

const nifty50 = [
    { ticker: "ADANIENT.NS", name: "Adani Enterprises Ltd." },
    { ticker: "ADANIPORTS.NS", name: "Adani Ports and Special Economic Zone Ltd." },
    { ticker: "APOLLOHOSP.NS", name: "Apollo Hospitals Enterprise Ltd." },
    { ticker: "ASIANPAINT.NS", name: "Asian Paints Ltd." },
    { ticker: "AXISBANK.NS", name: "Axis Bank Ltd." },
    { ticker: "BAJAJ-AUTO.NS", name: "Bajaj Auto Ltd." },
    { ticker: "BAJFINANCE.NS", name: "Bajaj Finance Ltd" },
    { ticker: "BAJAJFINSV.NS", name: "Bajaj Finserv Ltd." },
    { ticker: "BHARTIARTL.NS", name: "Bharti Airtel Ltd." },
    { ticker: "BPCL.NS", name: "Bharat Petroleum Corporation Ltd." },
    { ticker: "BRITANNIA.NS", name: "Britannia Industries Ltd." },
    { ticker: "CIPLA.NS", name: "Cipla Ltd." },
    { ticker: "COALINDIA.NS", name: "Coal India Ltd." },
    { ticker: "DIVISLAB.NS", name: "Divi's Laboratories Ltd." },
    { ticker: "DRREDDY.NS", name: "Dr. Reddy's Laboratories Ltd." },
    { ticker: "EICHERMOT.NS", name: "Eicher Motors Ltd." },
    { ticker: "GRASIM.NS", name: "Grasim Industries Ltd." },
    { ticker: "HCLTECH.NS", name: "HCL Technologies Ltd." },
    { ticker: "HDFCBANK.NS", name: "HDFC Bank Ltd." },
    { ticker: "HDFCLIFE.NS", name: "HDFC Life Insurance Company Ltd." },
    { ticker: "HEROMOTOCO.NS", name: "Hero MotoCorp Ltd." },
    { ticker: "HINDALCO.NS", name: "Hindalco Industries Ltd." },
    { ticker: "HINDUNILVR.NS", name: "Hindustan Unilever Ltd." },
    { ticker: "ICICIBANK.NS", name: "ICICI Bank Ltd." },
    { ticker: "INDUSINDBK.NS", name: "IndusInd Bank Ltd." },
    { ticker: "INFY.NS", name: "Infosys Ltd." },
    { ticker: "ITC.NS", name: "ITC Ltd." },
    { ticker: "JSWSTEEL.NS", name: "JSW Steel Ltd." },
    { ticker: "KOTAKBANK.NS", name: "Kotak Mahindra Bank Ltd." },
    { ticker: "LT.NS", name: "Larsen & Toubro Ltd." },
    { ticker: "M&M.NS", name: "Mahindra & Mahindra Ltd." },
    { ticker: "MARUTI.NS", name: "Maruti Suzuki India Ltd." },
    { ticker: "NESTLEIND.NS", name: "Nestlé India Ltd." },
    { ticker: "NTPC.NS", name: "NTPC Ltd." },
    { ticker: "ONGC.NS", name: "Oil & Natural Gas Corporation Ltd." },
    { ticker: "POWERGRID.NS", name: "Power Grid Corporation of India Ltd." },
    { ticker: "RELIANCE.NS", name: "Reliance Industries Ltd." },
    { ticker: "SBIN.NS", name: "State Bank of India" },
    { ticker: "SBILIFE.NS", name: "SBI Life Insurance Company Ltd." },
    { ticker: "SHRIRAMFIN.NS", name: "Shriram Finance Ltd." },
    { ticker: "SUNPHARMA.NS", name: "Sun Pharmaceutical Industries Ltd." },
    { ticker: "TCS.NS", name: "Tata Consultancy Services Ltd." },
    { ticker: "TATACONSUM.NS", name: "Tata Consumer Products Ltd." },
    { ticker: "TATAMOTORS.NS", name: "Tata Motors Ltd." },
    { ticker: "TATASTEEL.NS", name: "Tata Steel Ltd." },
    { ticker: "TECHM.NS", name: "Tech Mahindra Ltd." },
    { ticker: "TITAN.NS", name: "Titan Company Ltd." },
    { ticker: "ULTRACEMCO.NS", name: "UltraTech Cement Ltd." },
    { ticker: "UPL.NS", name: "UPL Ltd." },
    { ticker: "WIPRO.NS", name: "Wipro Ltd." }
];

async function seedInstruments() {
    try {
        await sequelize.sync();
        console.log('Database synced. Seeding instruments...');

        for (const scrip of nifty50) {
            const [instrument, created] = await Instrument.findOrCreate({
                where: { ticker: scrip.ticker },
                defaults: {
                    name: scrip.name,
                    type: 'stock',
                    category: 'aspiration', // Default category
                    currentPrice: 0
                }
            });

            if (created) {
                console.log(`Created: ${scrip.ticker}`);
            } else {
                console.log(`Exists: ${scrip.ticker}`);
            }
        }

        console.log('Seeding complete.');
    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        await sequelize.close();
    }
}

seedInstruments();
