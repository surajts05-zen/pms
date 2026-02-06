import React, { useState, useEffect } from 'react';
import { formatIndianRupeeInt } from '../utils/formatCurrency';
import { Loader2, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import api from '../services/api';

const BalanceSheet = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/financial-statements/balance-sheet');
            setData(res.data);
        } catch (err) {
            console.error('Error fetching balance sheet:', err);
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

    const assets = data.filter(d => d.type === 'Asset');
    const liabilities = data.filter(d => d.type === 'Liability');
    const equity = data.filter(d => d.type === 'Equity');

    const totalAssets = assets.reduce((sum, d) => sum + d.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, d) => sum + d.balance, 0);
    const totalEquity = equity.reduce((sum, d) => sum + d.balance, 0);

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

    const renderGroup = (title, groups, color) => (
        <div className="bs-section" style={{ marginBottom: '2rem' }}>
            <h2 style={{ color: color, marginBottom: '1rem', borderBottom: `2px solid ${color}`, display: 'inline-block', paddingRight: '2rem' }}>{title}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {Object.entries(groups).map(([type, items]) => (
                    <div key={type} className="card" style={{ padding: '1rem' }}>
                        <h3 style={{ textTransform: 'capitalize', fontSize: '1rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>{type}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {items.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                                    <span>{item.name}</span>
                                    <span style={{ fontWeight: '600' }}>{formatIndianRupeeInt(item.balance)}</span>
                                </div>
                            ))}
                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                <span>Subtotal</span>
                                <span>{formatIndianRupeeInt(items.reduce((sum, i) => sum + i.balance, 0))}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="balance-sheet">
            <div className="bs-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>TOTAL ASSETS</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>{formatIndianRupeeInt(totalAssets)}</div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid #ef4444' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>TOTAL LIABILITIES</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>{formatIndianRupeeInt(totalLiabilities)}</div>
                </div>
                <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>EQUITY / NET WORTH</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{formatIndianRupeeInt(totalAssets - totalLiabilities)}</div>
                </div>
            </div>

            {renderGroup('ASSETS', assetGroups, 'var(--accent)')}
            {renderGroup('LIABILITIES', liabilityGroups, '#ef4444')}

            {equity.length > 0 && renderGroup('EQUITY', { 'Equity': equity }, 'var(--primary)')}

            <style dangerouslySetInnerHTML={{
                __html: `
                .bs-section h2 {
                    letter-spacing: 0.1em;
                    font-size: 1.2rem;
                }
            ` }} />
        </div>
    );
};

export default BalanceSheet;
