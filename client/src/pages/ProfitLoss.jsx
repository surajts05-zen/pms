import React, { useState, useEffect } from 'react';
import { formatIndianRupeeInt } from '../utils/formatCurrency';
import { Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import api from '../services/api';

const ProfitLoss = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('2025-04-01');
    const [endDate, setEndDate] = useState('2026-03-31');

    const [viewType, setViewType] = useState('yearly'); // 'monthly', 'yearly', 'custom'
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
    const [selectedYear, setSelectedYear] = useState(2025); // Default to FY 2025-26

    // Helper to get date range from selection
    useEffect(() => {
        let start, end;
        if (viewType === 'monthly') {
            const firstDay = new Date(selectedYear, selectedMonth, 1);
            const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
            start = firstDay.toLocaleDateString('en-CA'); // YYYY-MM-DD
            end = lastDay.toLocaleDateString('en-CA');
        } else if (viewType === 'yearly') {
            // Financial Year: Apr 1 (Year) to Mar 31 (Year+1)
            start = `${selectedYear}-04-01`;
            end = `${selectedYear + 1}-03-31`;
        }

        if (viewType !== 'custom') {
            setStartDate(start);
            setEndDate(end);
        }
    }, [viewType, selectedMonth, selectedYear]);

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/financial-statements/profit-loss?startDate=${startDate}&endDate=${endDate}`);
            setData(res.data);
        } catch (err) {
            console.error('Error fetching profit & loss:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && data.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            </div>
        );
    }

    // Sort months: YYYY-MM
    const months = [...new Set(data.map(d => d.month))].sort();
    const categories = {};

    data.forEach(d => {
        if (!categories[d.categoryName]) {
            categories[d.categoryName] = {
                name: d.categoryName,
                type: d.accountType,
                subType: d.subType,
                monthly: {}
            };
        }
        categories[d.categoryName].monthly[d.month] = parseFloat(d.balance || 0);
    });

    const incomeCategories = Object.values(categories).filter(c => c.type === 'Revenue');
    const expenseCategories = Object.values(categories).filter(c => c.type === 'Expense');

    const calculateTotal = (cats, month) => {
        return cats.reduce((sum, cat) => sum + (cat.monthly[month] || 0), 0);
    };

    const calculateCatTotal = (cat) => {
        return Object.values(cat.monthly).reduce((a, b) => a + b, 0);
    };

    return (
        <div className="profit-loss">
            <div className="header" style={{ marginBottom: '2rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h2>Profit & Loss</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Income vs Expenses Statement</p>
                </div>

                <div
                    className="filter-bar"
                    style={{
                        background: 'var(--card-bg)',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        gap: '2rem',
                        alignItems: 'flex-end'
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>PERIOD TYPE</label>
                        <select
                            value={viewType}
                            onChange={(e) => setViewType(e.target.value)}
                            className="filter-input"
                            style={{ width: '160px', height: '40px' }}
                        >
                            <option value="monthly">Monthly View</option>
                            <option value="yearly">Financial Year</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    {viewType === 'monthly' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>MONTH</label>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="filter-input"
                                style={{ width: '140px', height: '40px' }}
                            >
                                <option value={0}>January</option>
                                <option value={1}>February</option>
                                <option value={2}>March</option>
                                <option value={3}>April</option>
                                <option value={4}>May</option>
                                <option value={5}>June</option>
                                <option value={6}>July</option>
                                <option value={7}>August</option>
                                <option value={8}>September</option>
                                <option value={9}>October</option>
                                <option value={10}>November</option>
                                <option value={11}>December</option>
                            </select>
                        </div>
                    )}

                    {viewType === 'monthly' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>YEAR</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="filter-input"
                                style={{ width: '100px', height: '40px' }}
                            >
                                {[2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {viewType === 'yearly' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>FY STARTING</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="filter-input"
                                style={{ width: '140px', height: '40px' }}
                            >
                                {[2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y}>FY {y}-{y + 1}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {viewType === 'custom' && (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>FROM</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="filter-input"
                                    style={{ width: '150px', height: '40px' }}
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>TO</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="filter-input"
                                    style={{ width: '150px', height: '40px' }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div className="table-container shadow-xl">
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead style={{ background: 'var(--card-bg)', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th style={{ position: 'sticky', left: 0, background: 'var(--card-bg)', zIndex: 20, padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border)', minWidth: '200px' }}>Category</th>
                                {months.map(m => (
                                    <th key={m} style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid var(--border)', minWidth: '120px' }}>{m}</th>
                                ))}
                                <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Income Section */}
                            <tr style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                                <td colSpan={months.length + 2} style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ArrowUpCircle size={18} /> INCOME
                                    </div>
                                </td>
                            </tr>
                            {incomeCategories.map(cat => (
                                <tr key={cat.name} className="table-row-hover">
                                    <td style={{ position: 'sticky', left: 0, background: 'var(--bg-color)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>{cat.name}</td>
                                    {months.map(m => (
                                        <td key={m} style={{ padding: '0.75rem 1rem', textAlign: 'right', borderBottom: '1px solid var(--border)', color: 'var(--accent)' }}>
                                            {cat.monthly[m] ? formatIndianRupeeInt(cat.monthly[m]) : '-'}
                                        </td>
                                    ))}
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 'bold', color: 'var(--accent)' }}>
                                        {formatIndianRupeeInt(calculateCatTotal(cat))}
                                    </td>
                                </tr>
                            ))}
                            <tr style={{ fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.05)' }}>
                                <td style={{ position: 'sticky', left: 0, background: 'var(--bg-color)', padding: '1rem', borderBottom: '2px solid var(--accent)' }}>Total Income</td>
                                {months.map(m => (
                                    <td key={m} style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid var(--accent)', color: 'var(--accent)' }}>
                                        {formatIndianRupeeInt(calculateTotal(incomeCategories, m))}
                                    </td>
                                ))}
                                <td style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid var(--accent)', color: 'var(--accent)' }}>
                                    {formatIndianRupeeInt(months.reduce((sum, m) => sum + calculateTotal(incomeCategories, m), 0))}
                                </td>
                            </tr>

                            <tr style={{ height: '2rem' }}></tr>

                            {/* Expense Section */}
                            <tr style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                                <td colSpan={months.length + 2} style={{ padding: '0.75rem 1rem', fontWeight: 'bold', color: '#ef4444' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <ArrowDownCircle size={18} /> EXPENSES
                                    </div>
                                </td>
                            </tr>
                            {expenseCategories.map(cat => (
                                <tr key={cat.name} className="table-row-hover">
                                    <td style={{ position: 'sticky', left: 0, background: 'var(--bg-color)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>{cat.name}</td>
                                    {months.map(m => (
                                        <td key={m} style={{ padding: '0.75rem 1rem', textAlign: 'right', borderBottom: '1px solid var(--border)', color: '#ef4444' }}>
                                            {cat.monthly[m] ? formatIndianRupeeInt(cat.monthly[m]) : '-'}
                                        </td>
                                    ))}
                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 'bold', color: '#ef4444' }}>
                                        {formatIndianRupeeInt(calculateCatTotal(cat))}
                                    </td>
                                </tr>
                            ))}
                            <tr style={{ fontWeight: 'bold', background: 'rgba(239, 68, 68, 0.05)' }}>
                                <td style={{ position: 'sticky', left: 0, background: 'var(--bg-color)', padding: '1rem', borderBottom: '2px solid #ef4444' }}>Total Expenses</td>
                                {months.map(m => (
                                    <td key={m} style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #ef4444', color: '#ef4444' }}>
                                        {formatIndianRupeeInt(calculateTotal(expenseCategories, m))}
                                    </td>
                                ))}
                                <td style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #ef4444', color: '#ef4444' }}>
                                    {formatIndianRupeeInt(months.reduce((sum, m) => sum + calculateTotal(expenseCategories, m), 0))}
                                </td>
                            </tr>

                            <tr style={{ height: '3rem' }}></tr>

                            {/* Net Profit/Loss */}
                            <tr style={{ fontWeight: 'bold', background: 'rgba(99, 102, 241, 0.1)', fontSize: '1.1rem' }}>
                                <td style={{ position: 'sticky', left: 0, background: 'var(--card-bg)', padding: '1.25rem 1rem', borderTop: '2px solid var(--primary)' }}>Profit / (Loss)</td>
                                {months.map(m => {
                                    const net = calculateTotal(incomeCategories, m) - calculateTotal(expenseCategories, m);
                                    return (
                                        <td key={m} style={{ padding: '1.25rem 1rem', textAlign: 'right', borderTop: '2px solid var(--primary)', color: net >= 0 ? 'var(--accent)' : '#ef4444' }}>
                                            {formatIndianRupeeInt(net)}
                                        </td>
                                    );
                                })}
                                <td style={{ padding: '1.25rem 1rem', textAlign: 'right', borderTop: '2px solid var(--primary)', color: 'var(--text-main)' }}>
                                    {formatIndianRupeeInt(
                                        months.reduce((sum, m) => sum + calculateTotal(incomeCategories, m) - calculateTotal(expenseCategories, m), 0)
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
    .table - row - hover:hover {
    background: rgba(255, 255, 255, 0.02);
}
                .profit - loss table th, .profit - loss table td {
    white - space: nowrap;
}
` }} />
        </div>
    );
};

export default ProfitLoss;
