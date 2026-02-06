import React, { useState, useEffect } from 'react';
import { formatIndianRupeeInt } from '../utils/formatCurrency';
import { Loader2, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import api from '../services/api';

const IncomeStatement = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/financial-statements/income-statement');
            setData(res.data);
        } catch (err) {
            console.error('Error fetching income statement:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
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
        <div className="income-statement">
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

                            {/* Net Surplus/Deficit */}
                            <tr style={{ fontWeight: 'bold', background: 'rgba(99, 102, 241, 0.1)', fontSize: '1.1rem' }}>
                                <td style={{ position: 'sticky', left: 0, background: 'var(--card-bg)', padding: '1.25rem 1rem', borderTop: '2px solid var(--primary)' }}>Surplus / (Deficit)</td>
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
                .table-row-hover:hover {
                    background: rgba(255, 255, 255, 0.02);
                }
                .income-statement table th, .income-statement table td {
                    white-space: nowrap;
                }
            ` }} />
        </div>
    );
};

export default IncomeStatement;
