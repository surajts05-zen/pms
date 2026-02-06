const express = require('express');
const router = express.Router();
const { Transaction, Instrument, Account, sequelize } = require('../models');
const priceService = require('../priceService');
const xirr = require('xirr');
const { authenticateToken } = require('./auth');

router.get('/', authenticateToken, async (req, res) => {
    try {
        const { category, accountId } = req.query;

        // Build Account filter: exclude family accounts from "ALL" view
        let accountWhere = { UserId: req.user.id };
        if (accountId) {
            accountWhere.id = accountId;
        } else {
            // When viewing "ALL", exclude family accounts
            accountWhere.isFamily = false;
        }

        const queryOptions = {
            where: { UserId: req.user.id },
            include: [
                {
                    model: Instrument,
                    where: category ? { category } : {}
                },
                {
                    model: Account,
                    where: accountWhere
                }
            ],
            order: [['transactionDate', 'ASC']]
        };

        let transactions = await Transaction.findAll(queryOptions);

        // Custom Sort: Within the same date, process Corporate Actions (Split/Bonus/Demerger) FIRST.
        // This ensures they apply to the *opening balance* of that day, not including intraday buys.
        const typePriority = {
            'split': 1,
            'bonus': 1,
            'demerger': 1,
            'buy': 2,
            'sell': 2,
            'transfer_in': 2,
            'transfer_out': 2,
            'dividend': 2,
            'deposit': 2,
            'withdrawal': 2,
            'demerger': 1,
            'resulting': 2
        };

        transactions.sort((a, b) => {
            const dateA = new Date(a.transactionDate).getTime();
            const dateB = new Date(b.transactionDate).getTime();
            if (dateA !== dateB) return dateA - dateB;

            const priorityA = typePriority[a.type] || 3;
            const priorityB = typePriority[b.type] || 3;
            return priorityA - priorityB;
        });

        const holdings = {};

        transactions.forEach(t => {
            const ticker = t.Instrument.ticker;
            if (!holdings[ticker]) {
                holdings[ticker] = {
                    ticker: ticker,
                    name: t.Instrument.name,
                    quantity: 0,
                    totalCost: 0,
                    avgPrice: 0,
                    instrumentId: t.Instrument.id,
                    cashFlows: [],
                    firstBuyDate: null
                };
            }

            const h = holdings[ticker];
            const qty = parseFloat(t.quantity);
            const price = parseFloat(t.price);

            if (t.type === 'buy' || t.type === 'transfer_in' || t.type === 'bonus' || t.type === 'split' || t.type === 'demerger' || t.type === 'resulting') {
                if (t.type === 'split') {
                    // split: quantity acts as a multiplier (e.g. 5 means 1 becomes 5)
                    // Price usually adjusts inversely, but here we just track holdings.
                    // Avg price effectively divides by ratio, but total cost stays same.
                    h.quantity = h.quantity * qty;
                } else if (t.type === 'bonus') {
                    // bonus: quantity acts as ratio (e.g. 1 means 1:1, so we add 1*currentQty)
                    h.quantity = h.quantity + (h.quantity * qty);
                } else if (t.type === 'demerger') {
                    // demerger: quantity acts as "Cost Retention Ratio" (e.g. 0.4 means 40% cost retained)
                    // Reduces the Total Cost of the holding. Quantity remains same.
                    // Avg price reduces automatically.
                    h.totalCost = h.totalCost * qty;
                } else {
                    if (h.quantity === 0) {
                        h.firstBuyDate = t.transactionDate;
                    }
                    h.quantity += qty;
                    // Resulting company entry is treated exactly like a buy, cost is cost of acquisition
                    h.totalCost += (qty * price);
                    h.cashFlows.push({ amount: -1 * (qty * price), when: new Date(t.transactionDate) });
                }
            } else if (t.type === 'sell' || t.type === 'transfer_out') {
                const avg = h.quantity > 0 ? h.totalCost / h.quantity : 0;
                h.quantity -= qty;
                h.totalCost -= (qty * avg);
                h.cashFlows.push({ amount: qty * price, when: new Date(t.transactionDate) });
            }

            if (h.quantity > 0) {
                h.avgPrice = h.totalCost / h.quantity;
            } else {
                h.avgPrice = 0;
                h.totalCost = 0;
            }
        });

        // Remove zero holdings
        const activeHoldings = Object.values(holdings).filter(h => h.quantity > 0.0001);

        // Fetch live prices and enrich holdings
        const enrichedHoldings = await Promise.all(activeHoldings.map(async h => {
            const livePrice = await priceService.getLatestPrice(h.ticker);
            const currentValue = livePrice ? (h.quantity * livePrice) : (h.quantity * h.avgPrice);
            const pnl = currentValue - h.totalCost;
            const pnlPercent = h.totalCost > 0 ? (pnl / h.totalCost) * 100 : 0;

            // Metrics
            let holdingPeriodYears = 0;
            if (h.firstBuyDate) {
                const diffTime = Math.abs(new Date() - new Date(h.firstBuyDate));
                holdingPeriodYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
            }

            let xirrValue = 0;
            try {
                if (h.cashFlows && h.cashFlows.length > 0) {
                    const flows = [...h.cashFlows, { amount: currentValue, when: new Date() }];
                    // xirr library expects { amount, when }
                    const result = xirr(flows);
                    if (result && !isNaN(result)) {
                        xirrValue = result * 100; // Convert to percentage
                    }
                }
            } catch (e) {
                console.error(`XIRR calc failed for ${h.ticker}. Flows: ${JSON.stringify(h.cashFlows.length)}`, e.message);
                xirrValue = 0;
            }

            return {
                ...h,
                livePrice: livePrice || h.avgPrice,
                currentValue,
                pnl,
                pnlPercent,
                holdingPeriodYears,
                xirr: xirrValue
            };
        }));

        // Summary Calculations (A1-A7 logic)
        const summary = {
            totalProfitLoss: 0,
            currentPortfolioValue: 0,
            positionsCurrentValue: 0,
            investedValue: 0,
            positionsPurchaseCost: 0,
            stockTransfer: 0,
            cash: 0
        };

        // Aggregation from holdings (excluding specific Cash Balance instrument)
        enrichedHoldings.forEach(h => {
            if (h.ticker !== 'CASH') {
                summary.positionsCurrentValue += h.currentValue;
                summary.positionsPurchaseCost += h.totalCost;
                summary.totalProfitLoss += h.pnl;
            }
        });

        // Aggregation from all transactions for the current context (account/category)
        transactions.forEach(t => {
            const amount = parseFloat(t.price) * parseFloat(t.quantity);
            if (t.type === 'deposit') {
                summary.investedValue += amount;
                summary.cash += amount;
            } else if (t.type === 'withdrawal') {
                summary.investedValue -= amount;
                summary.cash -= amount;
            } else if (t.type === 'transfer_in') {
                summary.stockTransfer += amount;
            } else if (t.type === 'transfer_out') {
                summary.stockTransfer -= amount;
            } else if (t.type === 'buy') {
                summary.cash -= amount;
            } else if (t.type === 'sell') {
                summary.cash += amount;
            } else if (t.type === 'dividend') {
                summary.cash += amount;
                summary.totalProfitLoss += amount;
            }
        });

        // Net Portfolio Value = Positions Current Value + Cash
        summary.currentPortfolioValue = summary.positionsCurrentValue + summary.cash;

        // Add Weightage
        const finalHoldings = enrichedHoldings.map(h => ({
            ...h,
            weight: summary.currentPortfolioValue > 0 ? (h.currentValue / summary.currentPortfolioValue) * 100 : 0
        }));

        const sortedHoldings = finalHoldings.sort((a, b) => a.name.localeCompare(b.name));

        res.json({
            holdings: sortedHoldings,
            summary
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
