import React, { useState, useEffect } from 'react';
import FixedDeposits from './pages/FixedDeposits';
import Cashflow from './pages/Cashflow';
import Categories from './pages/Categories';
import Dividends from './pages/Dividends';
import Settings from './pages/Settings';
import {
    TrendingUp,
    Plus,
    LayoutDashboard,
    Briefcase,
    List,
    CreditCard,
    Trash2,
    Edit2,
    Landmark,
    Wallet,
    Tags,
    DollarSign,
    Settings as SettingsIcon
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import axios from 'axios';
import { formatIndianRupee, formatIndianRupeeInt } from './utils/formatCurrency';

const api = axios.create({
    baseURL: 'http://localhost:5000/api'
});

const mockData = [
    { date: '2023-08', value: 1250000 },
    { date: '2023-09', value: 1320000 },
    { date: '2023-10', value: 1280000 },
    { date: '2023-11', value: 1450000 },
    { date: '2023-12', value: 1580000 },
    { date: '2024-01', value: 1620000 },
];

const allocationData = [
    { name: 'Conservative', value: 400000, color: '#6366f1' },
    { name: 'Aspiration', value: 800000, color: '#10b981' },
    { name: 'Safe (PF/FD)', value: 420000, color: '#f59e0b' },
];

function App() {
    const [activeTab, setActiveTab] = useState('summary');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [instruments, setInstruments] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [portfolioData, setPortfolioData] = useState([]);
    const [portfolioFilter, setPortfolioFilter] = useState('all');
    const [accountSummary, setAccountSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [draggedAccountId, setDraggedAccountId] = useState(null);

    const [formData, setFormData] = useState({
        accountId: '',
        instrumentId: '',
        type: 'buy',
        transactionDate: new Date().toISOString().split('T')[0],
        quantity: '',
        price: '',
        fees: 0,
        notes: ''
    });

    const [accountFormData, setAccountFormData] = useState({
        name: '',
        type: 'demat',
        institution: '',
        accountNumber: '',
        balance: 0,
        isFamily: false
    });

    const [journalFilters, setJournalFilters] = useState({
        date: '',
        scrip: '',
        account: '',
        type: '',
        qty: '',
        price: '',
        value: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, [isModalOpen, activeTab, portfolioFilter]);

    const fetchInitialData = async () => {
        try {
            const [accRes, insRes, traRes] = await Promise.all([
                api.get('/accounts'),
                api.get('/instruments'),
                api.get('/transactions')
            ]);

            const fetchedAccounts = accRes.data;
            setAccounts(fetchedAccounts);
            setInstruments(insRes.data);
            setTransactions(traRes.data);

            if (activeTab === 'portfolio' || activeTab === 'summary') {
                let params = {};
                if (portfolioFilter !== 'all') {
                    params.accountId = portfolioFilter;
                }

                const portRes = await api.get('/portfolio', { params });
                setPortfolioData(portRes.data.holdings || []);
                setAccountSummary(portRes.data.summary || null);
            }

            if (fetchedAccounts.length > 0 && !formData.accountId) {
                setFormData(prev => ({ ...prev, accountId: fetchedAccounts[0].id }));
            }
            if (insRes.data.length > 0 && !formData.instrumentId) {
                setFormData(prev => ({ ...prev, instrumentId: insRes.data[0].id }));
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        }
    };

    const reorderAccounts = async (reorderedAccounts) => {
        try {
            const accountsWithOrder = reorderedAccounts.map((acc, idx) => ({
                id: acc.id,
                displayOrder: idx
            }));
            await api.put('/accounts/reorder', { accounts: accountsWithOrder });
            fetchInitialData();
        } catch (err) {
            alert('Error reordering accounts: ' + err.message);
        }
    };

    const deleteAccount = async (id) => {
        if (!window.confirm('Are you sure you want to delete this account?')) return;
        try {
            await api.delete(`/accounts/${id}`);
            fetchInitialData();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/transactions', formData);
            setIsModalOpen(false);
            alert('Transaction added successfully!');
            fetchInitialData();
        } catch (err) {
            alert('Error adding transaction: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAccountSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingAccount) {
                await api.put(`/accounts/${editingAccount.id}`, accountFormData);
                alert('Account updated successfully!');
            } else {
                await api.post('/accounts', accountFormData);
                alert('Account added successfully!');
            }
            setAccountFormData({ name: '', type: 'demat', institution: '', accountNumber: '', balance: 0, isFamily: false });
            setEditingAccount(null);
            fetchInitialData();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const netWorthReal = portfolioData.reduce((acc, h) => acc + h.currentValue, 0);
    const totalInvestedReal = portfolioData.reduce((acc, h) => acc + h.totalCost, 0);
    const totalPnl = netWorthReal - totalInvestedReal;

    const renderSummary = () => (
        <div className="dashboard">
            <div className="stats-grid">
                <div className="card">
                    <h3>Live Net Worth</h3>
                    <div className="value">{formatIndianRupee(netWorthReal)}</div>
                    <div className={`change ${totalPnl >= 0 ? 'up' : 'down'}`}>
                        <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} /> {formatIndianRupee(totalPnl)} Profit
                    </div>
                </div>
                <div className="card">
                    <h3>Total Invested</h3>
                    <div className="value">{formatIndianRupee(totalInvestedReal)}</div>
                    <div className="change">Cost basis of current holdings</div>
                </div>
                <div className="card">
                    <h3>Total P&L</h3>
                    <div className={`value ${totalPnl >= 0 ? 'pnl-up' : 'pnl-down'}`}>
                        {totalInvestedReal > 0 ? ((totalPnl / totalInvestedReal) * 100).toFixed(1) : 0}%
                    </div>
                    <div className="change">Overall Return</div>
                </div>
                <div className="card">
                    <h3>Accounts</h3>
                    <div className="value">{accounts.length}</div>
                    <div className="change">{accounts.map(a => a.name).join(', ')}</div>
                </div>
            </div>

            <div className="chart-section">
                <div className="card" style={{ height: '400px' }}>
                    <h3>Portfolio Growth (Mock)</h3>
                    <ResponsiveContainer width="100%" height="90%">
                        <AreaChart data={mockData}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" vertical={false} />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis hide />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#161a23', border: '1px solid #2d3748', borderRadius: '8px' }}
                                itemStyle={{ color: '#f8fafc' }}
                            />
                            <Area type="monotone" dataKey="value" stroke="var(--primary)" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="card" style={{ height: '400px' }}>
                    <h3>Asset Allocation</h3>
                    <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                            <Pie data={allocationData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                {allocationData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#161a23', border: '1px solid #2d3748', borderRadius: '8px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );

    const renderPortfolio = () => (
        <section className="journal-section">
            <div className="header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Live Portfolio Holdings</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Real-time prices from Yahoo Finance</p>
                </div>
                {accountSummary && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', flex: 1, margin: '0 2rem' }}>
                        <div className="stat-card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>P/L</div>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: accountSummary.totalProfitLoss >= 0 ? 'var(--accent)' : '#ef4444' }}>
                                {formatIndianRupeeInt(accountSummary.totalProfitLoss)}
                            </div>
                        </div>
                        <div className="stat-card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Net Value</div>
                            <div style={{ fontSize: '1rem', fontWeight: '600' }}>
                                {formatIndianRupeeInt(accountSummary.currentPortfolioValue)}
                            </div>
                        </div>
                        <div className="stat-card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Invested</div>
                            <div style={{ fontSize: '1rem', fontWeight: '600' }}>
                                {formatIndianRupeeInt(accountSummary.investedValue)}
                            </div>
                        </div>
                        <div className="stat-card" style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cash</div>
                            <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--accent)' }}>
                                {formatIndianRupeeInt(accountSummary.cash)}
                            </div>
                        </div>
                    </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '0.5rem' }}>
                    <button
                        className={`nav-item ${portfolioFilter === 'all' ? 'active' : ''}`}
                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', border: 'none', background: 'none' }}
                        onClick={() => setPortfolioFilter('all')}
                    >
                        ALL
                    </button>
                    {accounts.filter(acc => acc.type === 'demat').map(acc => {
                        let label = acc.name.toUpperCase();

                        return (
                            <button
                                key={acc.id}
                                className={`nav-item ${portfolioFilter === acc.id ? 'active' : ''}`}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', border: 'none', background: 'none' }}
                                onClick={() => setPortfolioFilter(acc.id)}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Scrip</th>
                            <th>Qty</th>
                            <th>Avg. Price</th>
                            <th>CMP</th>
                            <th>Invested</th>
                            <th>Current</th>
                            <th>Hold. Period (Yrs)</th>
                            <th>XIRR</th>
                            <th>P&L</th>
                        </tr>
                    </thead>
                    <tbody>
                        {portfolioData.map(h => (
                            <tr key={h.ticker}>
                                <td style={{ fontWeight: '600' }}>{h.name} <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{h.ticker}</div></td>
                                <td>{h.quantity.toFixed(2)}</td>
                                <td>{formatIndianRupee(h.avgPrice)}</td>
                                <td style={{ color: 'var(--accent)' }}>{formatIndianRupee(h.livePrice)}</td>
                                <td>{formatIndianRupee(h.totalCost)}</td>
                                <td>{formatIndianRupee(h.currentValue)}</td>
                                <td>{h.holdingPeriodYears ? h.holdingPeriodYears.toFixed(1) : '-'}</td>
                                <td style={{ color: h.xirr >= 0 ? 'var(--accent)' : '#ef4444' }}>{h.xirr ? h.xirr.toFixed(1) + '%' : '-'}</td>
                                <td>
                                    <div className={h.pnl >= 0 ? 'pnl-up' : 'pnl-down'}>
                                        {h.pnl >= 0 ? '+' : ''}{formatIndianRupee(h.pnl)}
                                    </div>
                                    <div style={{ fontSize: '0.75rem' }} className={h.pnl >= 0 ? 'pnl-up' : 'pnl-down'}>
                                        ({h.pnlPercent.toFixed(1)}%)
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );

    const renderJournal = () => {
        // Calculate unique accounts for the dropdown
        const uniqueAccounts = [...new Set(transactions.map(t => t.Account?.name || '').filter(Boolean))].sort();

        return (
            <section className="journal-section">
                <div className="header" style={{ marginBottom: '1.5rem' }}>
                    <h2>Stock Journal</h2>
                </div>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ fontWeight: 'bold' }}>Date</th>
                                <th style={{ fontWeight: 'bold' }}>Scrip</th>
                                <th style={{ fontWeight: 'bold' }}>Account</th>
                                <th style={{ fontWeight: 'bold' }}>Type</th>
                                <th style={{ fontWeight: 'bold' }}>Qty</th>
                                <th style={{ fontWeight: 'bold' }}>Price</th>
                                <th style={{ fontWeight: 'bold' }}>Value</th>
                            </tr>
                            <tr>
                                <th style={{ padding: '0.5rem' }}><input type="text" placeholder="Filter..." value={journalFilters.date} onChange={e => setJournalFilters({ ...journalFilters, date: e.target.value })} style={{ width: '100%', padding: '0.25rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid #4a5568', color: 'var(--text-primary)' }} /></th>
                                <th style={{ padding: '0.5rem' }}><input type="text" placeholder="Filter..." value={journalFilters.scrip} onChange={e => setJournalFilters({ ...journalFilters, scrip: e.target.value })} style={{ width: '100%', padding: '0.25rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid #4a5568', color: 'var(--text-primary)' }} /></th>
                                <th style={{ padding: '0.5rem' }}>
                                    <select
                                        value={journalFilters.account}
                                        onChange={e => setJournalFilters({ ...journalFilters, account: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '0.25rem',
                                            fontSize: '0.8rem',
                                            background: '#1a202c',
                                            border: '1px solid #4a5568',
                                            color: '#e2e8f0',
                                            borderRadius: '0.25rem'
                                        }}
                                    >
                                        <option value="" style={{ background: '#1a202c', color: '#e2e8f0' }}>All</option>
                                        {uniqueAccounts.map(a => <option key={a} value={a} style={{ background: '#1a202c', color: '#e2e8f0' }}>{a}</option>)}
                                    </select>
                                </th>
                                <th style={{ padding: '0.5rem' }}><input type="text" placeholder="Filter..." value={journalFilters.type} onChange={e => setJournalFilters({ ...journalFilters, type: e.target.value })} style={{ width: '100%', padding: '0.25rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid #4a5568', color: 'var(--text-primary)' }} /></th>
                                <th style={{ padding: '0.5rem' }}><input type="text" placeholder="Filter..." value={journalFilters.qty} onChange={e => setJournalFilters({ ...journalFilters, qty: e.target.value })} style={{ width: '100%', padding: '0.25rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid #4a5568', color: 'var(--text-primary)' }} /></th>
                                <th style={{ padding: '0.5rem' }}><input type="text" placeholder="Filter..." value={journalFilters.price} onChange={e => setJournalFilters({ ...journalFilters, price: e.target.value })} style={{ width: '100%', padding: '0.25rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid #4a5568', color: 'var(--text-primary)' }} /></th>
                                <th style={{ padding: '0.5rem' }}><input type="text" placeholder="Filter..." value={journalFilters.value} onChange={e => setJournalFilters({ ...journalFilters, value: e.target.value })} style={{ width: '100%', padding: '0.25rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid #4a5568', color: 'var(--text-primary)' }} /></th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions
                                .filter(t => {
                                    const matchDate = t.transactionDate.toLowerCase().includes(journalFilters.date.toLowerCase());
                                    const matchScrip = (t.Instrument?.name || '').toLowerCase().includes(journalFilters.scrip.toLowerCase());
                                    const matchAccount = journalFilters.account ? t.Account?.name === journalFilters.account : true;
                                    const matchType = t.type.toLowerCase().includes(journalFilters.type.toLowerCase());
                                    const matchQty = t.quantity.toString().includes(journalFilters.qty);
                                    const matchPrice = t.price.toString().includes(journalFilters.price);
                                    const matchValue = (t.quantity * t.price).toString().includes(journalFilters.value);
                                    return matchDate && matchScrip && matchAccount && matchType && matchQty && matchPrice && matchValue;
                                })
                                .slice(0, 100)
                                .map(t => (
                                    <tr key={t.id}>
                                        <td>{t.transactionDate}</td>
                                        <td style={{ fontWeight: '600' }}>{t.Instrument?.name}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{t.Account?.name}</td>
                                        <td><span className={`type-tag type-${t.type}`}>{t.type}</span></td>
                                        <td>{parseFloat(t.quantity).toFixed(0)}</td>
                                        <td>{formatIndianRupee(parseFloat(t.price))}</td>
                                        <td style={{ fontWeight: '500' }}>{formatIndianRupee(t.quantity * t.price)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </section>
        );
    };

    const renderAccounts = () => (
        <section className="journal-section">
            <div className="header" style={{ marginBottom: '1.5rem' }}>
                <h2>Manage Accounts</h2>
            </div>

            <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>{editingAccount ? 'Edit Account' : 'Add New Account'}</h3>
                <form onSubmit={handleAccountSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '1rem', alignItems: 'end' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Account Name</label>
                        <input type="text" placeholder="e.g. Zerodha Primary" value={accountFormData.name} onChange={e => setAccountFormData({ ...accountFormData, name: e.target.value })} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Type</label>
                        <select value={accountFormData.type} onChange={e => setAccountFormData({ ...accountFormData, type: e.target.value })}>
                            <option value="demat">Demat</option>
                            <option value="bank">Bank</option>
                            <option value="cash">Cash</option>
                            <option value="creditcard">Credit Card</option>
                            <option value="loan">Loan</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Institution</label>
                        <input type="text" placeholder="e.g. HDFC Bank" value={accountFormData.institution} onChange={e => setAccountFormData({ ...accountFormData, institution: e.target.value })} required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Account No</label>
                        <input type="text" placeholder="Optional" value={accountFormData.accountNumber} onChange={e => setAccountFormData({ ...accountFormData, accountNumber: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                            type="checkbox"
                            id="isFamily"
                            checked={accountFormData.isFamily}
                            onChange={e => setAccountFormData({ ...accountFormData, isFamily: e.target.checked })}
                            style={{ width: 'auto', margin: 0 }}
                        />
                        <label htmlFor="isFamily" style={{ margin: 0, cursor: 'pointer' }}>Family Account</label>
                    </div>
                    <button type="submit" className="btn" disabled={loading}>
                        {loading ? (editingAccount ? 'Updating...' : 'Adding...') : (editingAccount ? 'Update Account' : 'Add Account')}
                    </button>
                    {editingAccount && (
                        <button type="button" className="btn outline" onClick={() => {
                            setEditingAccount(null);
                            setAccountFormData({ name: '', type: 'demat', institution: '', accountNumber: '', balance: 0, isFamily: false });
                        }}>
                            Cancel
                        </button>
                    )}
                </form>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '30px' }}></th>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Institution</th>
                            <th>Account No</th>
                            <th>Family</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.map((acc, index) => (
                            <tr
                                key={acc.id}
                                draggable
                                onDragStart={() => setDraggedAccountId(acc.id)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (draggedAccountId === acc.id) return;

                                    const draggedIndex = accounts.findIndex(a => a.id === draggedAccountId);
                                    const dropIndex = index;

                                    const reordered = [...accounts];
                                    const [draggedItem] = reordered.splice(draggedIndex, 1);
                                    reordered.splice(dropIndex, 0, draggedItem);

                                    setAccounts(reordered);
                                    reorderAccounts(reordered);
                                    setDraggedAccountId(null);
                                }}
                                onDragEnd={() => setDraggedAccountId(null)}
                                style={{
                                    cursor: 'move',
                                    opacity: draggedAccountId === acc.id ? 0.5 : 1,
                                    backgroundColor: draggedAccountId === acc.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent'
                                }}
                            >
                                <td style={{ textAlign: 'center', cursor: 'grab', color: 'var(--text-muted)' }}>⋮⋮</td>
                                <td style={{ fontWeight: '600' }}>{acc.name}</td>
                                <td style={{ textTransform: 'capitalize' }}>{acc.type}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{acc.institution}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{acc.accountNumber || '-'}</td>
                                <td>{acc.isFamily ? '✓' : ''}</td>
                                <td style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="action-btn edit" title="Edit Account" onClick={() => {
                                        setEditingAccount(acc);
                                        setAccountFormData({
                                            name: acc.name,
                                            type: acc.type,
                                            institution: acc.institution,
                                            accountNumber: acc.accountNumber || '',
                                            balance: acc.balance || 0,
                                            isFamily: acc.isFamily || false
                                        });
                                    }}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button className="action-btn delete" title="Delete Account" onClick={() => deleteAccount(acc.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );

    return (
        <>
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <span style={{ fontSize: '1.5rem' }}>💠</span> Portflo.ai
                </div>
                <nav className="nav-links">
                    <div className={`nav-item ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>
                        <LayoutDashboard size={20} /> Summary
                    </div>
                    <div className={`nav-item ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>
                        <Briefcase size={20} /> Live Portfolio
                    </div>
                    <div className={`nav-item ${activeTab === 'journal' ? 'active' : ''}`} onClick={() => setActiveTab('journal')}>
                        <List size={20} /> Stock Journal
                    </div>
                    <div className={`nav-item ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => setActiveTab('accounts')}>
                        <CreditCard size={20} /> Accounts
                    </div>
                    <div className={`nav-item ${activeTab === 'fds' ? 'active' : ''}`} onClick={() => setActiveTab('fds')}>
                        <Landmark size={20} /> Fixed Deposits
                    </div>
                    <div className={`nav-item ${activeTab === 'cashflow' ? 'active' : ''}`} onClick={() => setActiveTab('cashflow')}>
                        <Wallet size={20} /> Cashflow
                    </div>
                    <div className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>
                        <Tags size={20} /> Categories
                    </div>
                    <div className={`nav-item ${activeTab === 'dividends' ? 'active' : ''}`} onClick={() => setActiveTab('dividends')}>
                        <DollarSign size={20} /> Dividends
                    </div>
                    <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                        <SettingsIcon size={20} /> Settings
                    </div>
                </nav>

                <div style={{ marginTop: 'auto' }}>
                    <button className="btn" style={{ width: '100%' }} onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} style={{ marginRight: '8px' }} /> Add Transaction
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <header className="header" style={{ marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ textTransform: 'capitalize' }}>{activeTab}</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Managing your Portflo.ai Portfolio</p>
                    </div>
                </header>

                {activeTab === 'summary' && renderSummary()}
                {activeTab === 'portfolio' && renderPortfolio()}
                {activeTab === 'journal' && renderJournal()}
                {activeTab === 'accounts' && renderAccounts()}
                {activeTab === 'fds' && <FixedDeposits />}
                {activeTab === 'cashflow' && <Cashflow />}
                {activeTab === 'categories' && <Categories />}
                {activeTab === 'dividends' && <Dividends />}
                {activeTab === 'settings' && <Settings />}
            </main>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Add Transaction</h2>
                        <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
                            <div className="form-group">
                                <label>Account</label>
                                <select value={formData.accountId} onChange={e => setFormData({ ...formData, accountId: e.target.value })} required>
                                    <option value="">Select Account</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Instrument</label>
                                <select value={formData.instrumentId} onChange={e => setFormData({ ...formData, instrumentId: e.target.value })} required>
                                    <option value="">Select Instrument</option>
                                    {instruments.map(ins => <option key={ins.id} value={ins.id}>{ins.ticker} - {ins.name}</option>)}
                                </select>
                            </div>
                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Type</label>
                                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                        {['buy', 'sell', 'transfer_in', 'transfer_out', 'deposit', 'withdrawal', 'dividend', 'bonus', 'split'].map(t => (
                                            <option key={t} value={t}>{t.replace('_', ' ').toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input type="date" value={formData.transactionDate} onChange={e => setFormData({ ...formData, transactionDate: e.target.value })} required />
                                </div>
                            </div>
                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Quantity</label>
                                    <input type="number" step="0.0001" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label>Price</label>
                                    <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
                                </div>
                            </div>
                            <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn" style={{ flex: 1 }} disabled={loading}>
                                    {loading ? 'Adding...' : 'Add Transaction'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

export default App;
