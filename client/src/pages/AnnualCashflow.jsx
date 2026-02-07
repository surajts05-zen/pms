import React, { useState, useEffect } from 'react';
import { formatIndianRupeeInt } from '../utils/formatCurrency';
import { Loader2, ArrowUpCircle, ArrowDownCircle, TrendingUp } from 'lucide-react';
import api from '../services/api';

const AnnualCashflow = () => {
    const [data, setData] = useState(null);
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
            const res = await api.get(`/financial-statements/annual-cashflow?startDate=${startDate}&endDate=${endDate}`);
            setData(res.data);
        } catch (err) {
            console.error('Error fetching annual cashflow:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
            </div>
        );
    }

    const { months = [], categories = [], sectionTotals = {}, freeCashFlow = {}, netCashChange = {} } = data || {};

    // Group categories by section
    const operatingCats = categories.filter(c => c.section === 'operating');
    const investingCats = categories.filter(c => c.section === 'investing');
    const financingCats = categories.filter(c => c.section === 'financing');

    const calculateCatTotal = (cat) => {
        return Object.values(cat.monthly || {}).reduce((a, b) => a + b, 0);
    };

    const renderCategoryRow = (cat, color) => (
        <tr key={cat.categoryName} className="table-row-hover">
            <td style={{ position: 'sticky', left: 0, background: 'var(--bg-color)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
                {cat.categoryName}
            </td>
            {months.map(m => {
                const val = cat.monthly[m] || 0;
                return (
                    <td key={m} style={{
                        padding: '0.75rem 1rem',
                        textAlign: 'right',
                        borderBottom: '1px solid var(--border)',
                        color: val >= 0 ? 'var(--accent)' : '#ef4444'
                    }}>
                        {val !== 0 ? formatIndianRupeeInt(val) : '-'}
                    </td>
                );
            })}
            <td style={{
                padding: '0.75rem 1rem',
                textAlign: 'right',
                borderBottom: '1px solid var(--border)',
                fontWeight: 'bold',
                color: calculateCatTotal(cat) >= 0 ? 'var(--accent)' : '#ef4444'
            }}>
                {formatIndianRupeeInt(calculateCatTotal(cat))}
            </td>
        </tr>
    );

    const renderSectionHeader = (title, icon, bgColor) => (
        <tr style={{ background: bgColor }}>
            <td colSpan={months.length + 2} style={{ padding: '0.75rem 1rem', fontWeight: 'bold' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {icon} {title}
                </div>
            </td>
        </tr>
    );

    const renderSectionTotal = (title, sectionData, borderColor) => (
        <tr style={{ fontWeight: 'bold', background: 'rgba(255,255,255,0.02)' }}>
            <td style={{ position: 'sticky', left: 0, background: 'var(--bg-color)', padding: '1rem', borderBottom: `2px solid ${borderColor}` }}>
                {title}
            </td>
            {months.map(m => {
                const val = sectionData?.monthly?.[m] || 0;
                return (
                    <td key={m} style={{
                        padding: '1rem',
                        textAlign: 'right',
                        borderBottom: `2px solid ${borderColor}`,
                        color: val >= 0 ? 'var(--accent)' : '#ef4444'
                    }}>
                        {formatIndianRupeeInt(val)}
                    </td>
                );
            })}
            <td style={{
                padding: '1rem',
                textAlign: 'right',
                borderBottom: `2px solid ${borderColor}`,
                color: (sectionData?.total || 0) >= 0 ? 'var(--accent)' : '#ef4444'
            }}>
                {formatIndianRupeeInt(sectionData?.total || 0)}
            </td>
        </tr>
    );

    return (
        <div className="annual-cashflow">
            <div className="header" style={{ marginBottom: '2rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h2>Cash Flow Statement</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Annual Cash Flow Analysis with Free Cash Flow</p>
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

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Operating Cash Flow
                    </div>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: (sectionTotals.operating?.total || 0) >= 0 ? 'var(--accent)' : '#ef4444'
                    }}>
                        {formatIndianRupeeInt(sectionTotals.operating?.total || 0)}
                    </div>
                </div>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Investing Cash Flow
                    </div>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: (sectionTotals.investing?.total || 0) >= 0 ? 'var(--accent)' : '#ef4444'
                    }}>
                        {formatIndianRupeeInt(sectionTotals.investing?.total || 0)}
                    </div>
                </div>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Financing Cash Flow
                    </div>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: (sectionTotals.financing?.total || 0) >= 0 ? 'var(--accent)' : '#ef4444'
                    }}>
                        {formatIndianRupeeInt(sectionTotals.financing?.total || 0)}
                    </div>
                </div>
                <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <TrendingUp size={14} /> Free Cash Flow
                    </div>
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        color: (freeCashFlow?.total || 0) >= 0 ? '#10b981' : '#ef4444'
                    }}>
                        {formatIndianRupeeInt(freeCashFlow?.total || 0)}
                    </div>
                </div>
            </div>

            <div className="table-container shadow-xl">
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ minWidth: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead style={{ background: 'var(--card-bg)', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                <th style={{ position: 'sticky', left: 0, background: 'var(--card-bg)', zIndex: 20, padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border)', minWidth: '250px' }}>Category</th>
                                {months.map(m => (
                                    <th key={m} style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid var(--border)', minWidth: '120px' }}>{m}</th>
                                ))}
                                <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Operating Activities */}
                            {renderSectionHeader('CASH FLOWS FROM OPERATING ACTIVITIES', <ArrowUpCircle size={18} color="var(--accent)" />, 'rgba(16, 185, 129, 0.1)')}
                            {operatingCats.map(cat => renderCategoryRow(cat, 'var(--accent)'))}
                            {renderSectionTotal('Net Cash from Operations', sectionTotals.operating, 'var(--accent)')}

                            <tr style={{ height: '1.5rem' }}></tr>

                            {/* Investing Activities */}
                            {renderSectionHeader('CASH FLOWS FROM INVESTING ACTIVITIES', <ArrowDownCircle size={18} color="var(--primary)" />, 'rgba(99, 102, 241, 0.1)')}
                            {investingCats.map(cat => renderCategoryRow(cat, 'var(--primary)'))}
                            {renderSectionTotal('Net Cash from Investing', sectionTotals.investing, 'var(--primary)')}

                            <tr style={{ height: '1.5rem' }}></tr>

                            {/* Financing Activities */}
                            {renderSectionHeader('CASH FLOWS FROM FINANCING ACTIVITIES', <ArrowDownCircle size={18} color="#f59e0b" />, 'rgba(245, 158, 11, 0.1)')}
                            {financingCats.map(cat => renderCategoryRow(cat, '#f59e0b'))}
                            {renderSectionTotal('Net Cash from Financing', sectionTotals.financing, '#f59e0b')}

                            <tr style={{ height: '2rem' }}></tr>

                            {/* Free Cash Flow */}
                            <tr style={{ fontWeight: 'bold', background: 'rgba(16, 185, 129, 0.15)', fontSize: '1.05rem' }}>
                                <td style={{ position: 'sticky', left: 0, background: 'rgba(16, 185, 129, 0.15)', padding: '1.25rem 1rem', borderTop: '2px solid #10b981' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <TrendingUp size={18} color="#10b981" /> FREE CASH FLOW
                                    </div>
                                </td>
                                {months.map(m => {
                                    const val = freeCashFlow?.monthly?.[m] || 0;
                                    return (
                                        <td key={m} style={{
                                            padding: '1.25rem 1rem',
                                            textAlign: 'right',
                                            borderTop: '2px solid #10b981',
                                            color: val >= 0 ? '#10b981' : '#ef4444'
                                        }}>
                                            {formatIndianRupeeInt(val)}
                                        </td>
                                    );
                                })}
                                <td style={{
                                    padding: '1.25rem 1rem',
                                    textAlign: 'right',
                                    borderTop: '2px solid #10b981',
                                    color: (freeCashFlow?.total || 0) >= 0 ? '#10b981' : '#ef4444'
                                }}>
                                    {formatIndianRupeeInt(freeCashFlow?.total || 0)}
                                </td>
                            </tr>

                            <tr style={{ height: '1rem' }}></tr>

                            {/* Net Cash Change */}
                            <tr style={{ fontWeight: 'bold', background: 'rgba(99, 102, 241, 0.1)', fontSize: '1.1rem' }}>
                                <td style={{ position: 'sticky', left: 0, background: 'var(--card-bg)', padding: '1.25rem 1rem', borderTop: '2px solid var(--primary)' }}>
                                    NET INCREASE / (DECREASE) IN CASH
                                </td>
                                {months.map(m => {
                                    const val = netCashChange?.monthly?.[m] || 0;
                                    return (
                                        <td key={m} style={{
                                            padding: '1.25rem 1rem',
                                            textAlign: 'right',
                                            borderTop: '2px solid var(--primary)',
                                            color: val >= 0 ? 'var(--accent)' : '#ef4444'
                                        }}>
                                            {formatIndianRupeeInt(val)}
                                        </td>
                                    );
                                })}
                                <td style={{
                                    padding: '1.25rem 1rem',
                                    textAlign: 'right',
                                    borderTop: '2px solid var(--primary)',
                                    color: 'var(--text-main)'
                                }}>
                                    {formatIndianRupeeInt(netCashChange?.total || 0)}
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
    .annual-cashflow table th, .annual-cashflow table td {
        white-space: nowrap;
    }
` }} />
        </div>
    );
};

export default AnnualCashflow;
