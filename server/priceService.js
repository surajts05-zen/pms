const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

class PriceService {
    /**
     * Fetches the latest price for a given ticker.
     * @param {string} ticker - The stock ticker (e.g., "RELIANCE.NS", "AAPL")
     * @returns {Promise<number>} - The current price
     */
    async getLatestPrice(ticker) {
        try {
            const result = await yahooFinance.quote(ticker);
            return result.regularMarketPrice;
        } catch (error) {
            console.error(`Error fetching price for ${ticker}:`, error.message);
            return null;
        }
    }

    /**
     * Fetches historical prices for a range.
     * @param {string} ticker 
     * @param {string} from - YYYY-MM-DD
     * @param {string} to - YYYY-MM-DD
     */
    async getHistoricalPrices(ticker, from, to) {
        try {
            const queryOptions = { period1: from, period2: to };
            const result = await yahooFinance.historical(ticker, queryOptions);
            return result.map(day => ({
                date: day.date,
                close: day.close
            }));
        } catch (error) {
            console.error(`Error fetching historical prices for ${ticker}:`, error.message);
            return [];
        }
    }

    /**
     * Search for scrips using Yahoo Finance API.
     * @param {string} query 
     * @returns {Promise<Array<{ticker: string, name: string, exchange: string}>>}
     */
    async search(query) {
        try {
            const results = await yahooFinance.search(query);
            // Filter for Indian exchanges if needed, but for now just return relevant fields
            // Yahoo Finance returns exchange as 'NSI' for NSE usually, or suffix .NS
            return results.quotes
                .filter(q => q.isYahooFinance && (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO')))
                .map(q => ({
                    ticker: q.symbol,
                    name: q.shortname || q.longname || q.symbol,
                    exchange: q.exchange,
                    type: q.quoteType
                }));
        } catch (error) {
            console.error(`Error searching for ${query}:`, error.message);
            return [];
        }
    }
}

module.exports = new PriceService();
