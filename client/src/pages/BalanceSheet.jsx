import React, { useState, useEffect } from 'react';
import { formatIndianRupeeInt } from '../utils/formatCurrency';
import { Loader2, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import api from '../services/api';

const BalanceSheet = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);

    const [viewType, setViewType] = useState('fy_end'); // 'fy_end', 'custom'
    const [selectedYear, setSelectedYear] = useState(2025); // Defaults to FY 2025-26 end (Mar 2026)

    useEffect(() => {
        if (viewType === 'fy_end') {
            setAsOfDate(`${selectedYear + 1}-03-31`);
        }
    }, [viewType, selectedYear]);

    useEffect(() => {
        fetchData();
    }, [asOfDate]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/financial-statements/balance-sheet?date=${asOfDate}`);
            setData(res.data);
        } catch (err) {
            console.error('Error fetching balance sheet:', err);
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

    const assets = data.filter(d => d.type === 'Asset');
    const liabilities = data.filter(d => d.type === 'Liability');
    const equity = data.filter(d => d.type === 'Equity');

    const totalAssets = assets.reduce((sum, d) => sum + d.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, d) => sum + d.balance, 0);
    const totalEquity = equity.reduce((sum, d) => sum + d.balance, 0);

    // Total Liabilities Side = Total Liabilities + Total Equity
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    const groupByType = (items) => {
        const groups = {};
        items.forEach(item => {
            const type = item.subType || 'Other';
            if (!groups[type]) groups[type] = [];
            groups[type].push(item);
        });
        return groups;
    };

    const assetGroups = groupByType(assets);
    const liabilityGroups = groupByType(liabilities);
    const equityGroups = groupByType(equity);

    const renderSection = (title, items, total, color = 'var(--text-main)') => (
        <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
                borderBottom: `1px solid ${color}`,
                paddingBottom: '0.5rem',
                marginBottom: '1rem',
                color: color,
                textTransform: 'uppercase',
                fontSize: '0.9rem',
                letterSpacing: '0.05em'
            }}>
                {title}
            </h3>
            {items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{item.name}</span>
                    <span>{formatIndianRupeeInt(item.balance)}</span>
                </div>
            ))}
            <div style={{
                borderTop: '1px dashed var(--border)',
                marginTop: '0.5rem',
                paddingTop: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold'
            }}>
                <span>Total {title}</span>
                <span>{formatIndianRupeeInt(total)}</span>
            </div>
        </div>
    );

    const renderGroupedSection = (groups, color) => {
        return Object.entries(groups).map(([groupName, items]) => {
            const groupTotal = items.reduce((sum, i) => sum + i.balance, 0);
            return renderSection(groupName, items, groupTotal, color);
        });
    };



    return (
        <div className="balance-sheet">
            <div className="header" style={{ marginBottom: '2rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h2>Balance Sheet</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Financial Position Statement</p>
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
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>VIEW TYPE</label>
                        <select
                            value={viewType}
                            onChange={(e) => setViewType(e.target.value)}
                            className="filter-input"
                            style={{ width: '180px', height: '40px' }}
                        >
                            <option value="fy_end">Financial Year End</option>
                            <option value="custom">Custom Date</option>
                        </select>
                    </div>

                    {viewType === 'fy_end' && (
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>AS ON</label>
                            <input
                                type="date"
                                value={asOfDate}
                                onChange={(e) => setAsOfDate(e.target.value)}
                                className="filter-input"
                                style={{ width: '150px', height: '40px' }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="bs-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left Column: Liabilities & Equity */}
                <div className="bs-column" style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <h2 style={{ textAlign: 'center', borderBottom: '2px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>LIABILITIES</h2>

                    {/* Equity Section */}
                    {renderGroupedSection(equityGroups, 'var(--primary)')}

                    {/* Liabilities Section */}
                    {renderGroupedSection(liabilityGroups, '#ef4444')}

                    <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        <span>TOTAL LIABILITIES</span>
                        <span>{formatIndianRupeeInt(totalLiabilitiesAndEquity)}</span>
                    </div>
                </div>

                {/* Right Column: Assets */}
                <div className="bs-column" style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ textAlign: 'center', borderBottom: '2px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>ASSETS</h2>

                    {/* Assets Section */}
                    {renderGroupedSection(assetGroups, 'var(--accent)')}

                    <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold' }}>
                        <span>TOTAL ASSETS</span>
                        <span>{formatIndianRupeeInt(totalAssets)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BalanceSheet;
