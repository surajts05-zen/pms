import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit2, History, TrendingUp, Info, Save, Search, Filter } from 'lucide-react';
import { formatIndianRupee, formatIndianRupeeInt } from '../utils/formatCurrency';
import api from '../services/api';
import './GovtSchemes.css';

const GovtSchemes = () => {
    const [accounts, setAccounts] = useState([]);
    const [interestRates, setInterestRates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isRateModalOpen, setIsRateModalOpen] = useState(false);
    const [editingRate, setEditingRate] = useState(null);
    const [rateFormData, setRateFormData] = useState({
        instrumentType: 'ppf',
        rate: '',
        effectiveFrom: '',
        effectiveTo: ''
    });

    const [transactions, setTransactions] = useState([]);

    // Filter & Sort State
    const [filters, setFilters] = useState({
        search: '',
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: '',
        accountId: '',
        type: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'transactionDate', direction: 'desc' });

    useEffect(() => {
        fetchAccounts();
        fetchInterestRates();
    }, []);

    useEffect(() => {
        if (accounts.length > 0) {
            fetchTransactions();
        }
    }, [accounts]);

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/accounts');
            // Filter PF, PPF, SSY
            setAccounts(res.data.filter(a => ['pf', 'ppf', 'ssy'].includes(a.type)));
        } catch (err) {
            console.error('Error fetching accounts:', err);
        }
    };

    const fetchTransactions = async () => {
        try {
            const res = await api.get('/pf/transactions'); // New Endpoint
            setTransactions(res.data);
        } catch (err) {
            console.error('Error fetching transactions:', err);
        }
    };

    const fetchInterestRates = async () => {
        try {
            const res = await api.get('/interest-rates');
            setInterestRates(res.data);
        } catch (err) {
            console.error('Error fetching interest rates:', err);
        }
    };

    // Filter & Sort Logic
    const filteredTransactions = useMemo(() => {
        let result = transactions.filter(t => {
            // Search (Notes, Description)
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const notes = (t.notes || '').toLowerCase();
                const desc = (t.description || '').toLowerCase();
                if (!notes.includes(searchLower) && !desc.includes(searchLower)) {
                    return false;
                }
            }

            // Date Range
            if (filters.startDate && t.transactionDate < filters.startDate) return false;
            if (filters.endDate && t.transactionDate > filters.endDate) return false;

            // Amount Range
            if (filters.minAmount && Math.abs(t.amount) < parseFloat(filters.minAmount)) return false;
            if (filters.maxAmount && Math.abs(t.amount) > parseFloat(filters.maxAmount)) return false;

            // Account Filter
            if (filters.accountId && t.AccountId !== filters.accountId) return false;

            // Type Filter
            if (filters.type && t.type !== filters.type) return false;

            return true;
        });

        // Sorting
        return result.sort((a, b) => {
            if (sortConfig.key === 'amount') {
                return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
            }
            if (sortConfig.key === 'account') {
                const nameA = accounts.find(acc => acc.id === a.AccountId)?.name || '';
                const nameB = accounts.find(acc => acc.id === b.AccountId)?.name || '';
                return sortConfig.direction === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            }
            if (sortConfig.key === 'description') {
                const descA = a.notes || a.description || '';
                const descB = b.notes || b.description || '';
                return sortConfig.direction === 'asc' ? descA.localeCompare(descB) : descB.localeCompare(descA);
            }

            let valA = a[sortConfig.key] || '';
            let valB = b[sortConfig.key] || '';

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [transactions, filters, sortConfig, accounts]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleRateSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingRate) {
                await api.put(`/interest-rates/${editingRate.id}`, rateFormData);
                alert('Interest rate updated successfully!');
            } else {
                await api.post('/interest-rates', rateFormData);
                alert('Interest rate added successfully!');
            }
            setIsRateModalOpen(false);
            setEditingRate(null);
            setRateFormData({ instrumentType: 'ppf', rate: '', effectiveFrom: '', effectiveTo: '' });
            fetchInterestRates();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEditRate = (rate) => {
        setEditingRate(rate);
        setRateFormData({
            instrumentType: rate.instrumentType,
            rate: rate.rate,
            effectiveFrom: rate.effectiveFrom,
            effectiveTo: rate.effectiveTo || ''
        });
        setIsRateModalOpen(true);
    };

    const deleteRate = async (id) => {
        if (!window.confirm('Delete this rate entry?')) return;
        try {
            await api.delete(`/interest-rates/${id}`);
            fetchInterestRates();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    const getInstrumentLabel = (type) => {
        switch (type) {
            case 'pf': return 'Provident Fund';
            case 'ppf': return 'Public Provident Fund';
            case 'ssy': return 'Sukanya Samriddhi';
            default: return type.toUpperCase();
        }
    };

    const [isSchemeModalOpen, setIsSchemeModalOpen] = useState(false);
    const [schemeFormData, setSchemeFormData] = useState({ name: '', type: 'ppf', institution: '', currency: 'INR' });

    const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
    const [editingTxn, setEditingTxn] = useState(null);
    const [txnFormData, setTxnFormData] = useState({
        transactionDate: new Date().toISOString().split('T')[0],
        AccountId: '',
        type: 'deposit',
        amount: '',
        notes: ''
    });

    const handleSchemeSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/accounts', schemeFormData);
            alert('Scheme account added successfully!');
            setIsSchemeModalOpen(false);
            setSchemeFormData({ name: '', type: 'ppf', institution: '', currency: 'INR' });
            fetchAccounts();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTxnSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { ...txnFormData };
            if (editingTxn) {
                await api.put(`/pf/transactions/${editingTxn.id}`, payload);
            } else {
                await api.post('/pf/transactions', payload);
            }
            alert('Transaction saved successfully!');
            setIsTxnModalOpen(false);
            setEditingTxn(null);
            fetchTransactions();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEditTxn = (txn) => {
        setEditingTxn(txn);
        setTxnFormData({
            transactionDate: txn.transactionDate ? txn.transactionDate.split('T')[0] : '',
            AccountId: txn.AccountId,
            type: txn.type || 'deposit',
            amount: txn.amount, // Changed from quantity
            notes: txn.notes || txn.description || ''
        });
        setIsTxnModalOpen(true);
    };

    const handleDeleteTxn = async (id) => {
        if (!window.confirm('Delete this transaction?')) return;
        try {
            await api.delete(`/pf/transactions/${id}`);
            fetchTransactions();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    const openAddTxnModal = () => {
        setEditingTxn(null);
        setTxnFormData({
            transactionDate: new Date().toISOString().split('T')[0],
            AccountId: accounts.length > 0 ? accounts[0].id : '',
            type: 'deposit',
            amount: '',
            notes: ''
        });
        setIsTxnModalOpen(true);
    };

    return (
        <section className="journal-section">
            <div className="header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Government Schemes</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Manage PF, PPF, and Sukanya Samriddhi accounts</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="file"
                            id="pf-upload"
                            style={{ display: 'none' }}
                            accept=".pdf"
                            onChange={async (e) => {
                                if (!e.target.files[0]) return;
                                const formData = new FormData();
                                formData.append('file', e.target.files[0]);
                                setLoading(true);
                                try {
                                    const res = await api.post('/pf/upload', formData, {
                                        headers: { 'Content-Type': 'multipart/form-data' }
                                    });
                                    alert(res.data.message);
                                    fetchAccounts();
                                } catch (err) {
                                    alert('Upload failed: ' + (err.response?.data?.error || err.message));
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        />
                        <button className="btn btn-secondary" onClick={() => document.getElementById('pf-upload').click()} disabled={loading}>
                            {loading ? 'Uploading...' : 'Upload PF Statement'}
                        </button>
                    </div>
                    <button className="btn btn-secondary" onClick={() => setIsSchemeModalOpen(true)}>
                        <Plus size={16} style={{ marginRight: '6px' }} /> Add Scheme
                    </button>
                    <button className="btn" onClick={() => { setEditingRate(null); setRateFormData({ instrumentType: 'ppf', rate: '', effectiveFrom: '', effectiveTo: '' }); setIsRateModalOpen(true); }}>
                        <Plus size={16} style={{ marginRight: '6px' }} /> Add Rate
                    </button>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                {['pf', 'ppf', 'ssy'].map(type => {
                    const total = accounts.filter(a => a.type === type).reduce((sum, a) => sum + Number(a.balance), 0);
                    return (
                        <div className="card" key={type}>
                            <h3>Total {getInstrumentLabel(type)}</h3>
                            <div className="value">{formatIndianRupee(total)}</div>
                            <div className="change">{accounts.filter(a => a.type === type).length} Accounts</div>
                        </div>
                    );
                })}
            </div>

            <div className="chart-section" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Active Accounts</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Account Name</th>
                                    <th>Type</th>
                                    <th>Institution</th>
                                    <th>Current Balance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map(acc => (
                                    <tr key={acc.id}>
                                        <td style={{ fontWeight: '600' }}>{acc.name}</td>
                                        <td>{getInstrumentLabel(acc.type)}</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{acc.institution}</td>
                                        <td style={{ fontWeight: '500', color: 'var(--accent)' }}>{formatIndianRupee(Number(acc.balance))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Interest Rate History</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Rate</th>
                                    <th>From</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {interestRates.map(rate => (
                                    <tr key={rate.id}>
                                        <td>{rate.instrumentType.toUpperCase()}</td>
                                        <td style={{ fontWeight: '600' }}>{rate.rate}%</td>
                                        <td style={{ fontSize: '0.85rem' }}>{rate.effectiveFrom}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="action-btn edit" onClick={() => handleEditRate(rate)}><Edit2 size={14} /></button>
                                                <button className="action-btn delete" onClick={() => deleteRate(rate.id)}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3>Recent Transactions</h3>
                    <button className="btn-sm" onClick={openAddTxnModal}>
                        <Plus size={14} style={{ marginRight: '4px' }} /> Add Transaction
                    </button>
                </div>

                {/* Filter Bar */}
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '1rem',
                    borderRadius: '0.75rem',
                    marginBottom: '1rem',
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search notes or description..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                style={{ width: '100%', paddingLeft: '32px', background: 'var(--bg-color)', border: '1px solid var(--border)' }}
                            />
                        </div>
                        <button
                            className={`btn ${showFilters ? '' : 'outline'}`}
                            onClick={() => setShowFilters(!showFilters)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <Filter size={16} /> Filters
                        </button>
                    </div>

                    {/* Extended Filters */}
                    {showFilters && (
                        <div style={{
                            marginTop: '1rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid var(--border)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '1rem'
                        }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>Account</label>
                                <select
                                    value={filters.accountId}
                                    onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}
                                    style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                                >
                                    <option value="">All Accounts</option>
                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>Transaction Type</label>
                                <select
                                    value={filters.type}
                                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                    style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                                >
                                    <option value="">All Types</option>
                                    <option value="deposit">Deposit</option>
                                    <option value="withdrawal">Withdrawal</option>
                                    <option value="interest">Interest</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>From Date</label>
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                    style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>To Date</label>
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                    style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label style={{ fontSize: '0.75rem' }}>Min Amount</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={filters.minAmount}
                                    onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                                    style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    onClick={() => requestSort('transactionDate')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        Date
                                        {sortConfig.key === 'transactionDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </div>
                                </th>
                                <th
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    onClick={() => requestSort('account')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        Account
                                        {sortConfig.key === 'account' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </div>
                                </th>
                                <th
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    onClick={() => requestSort('description')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        Description / Notes
                                        {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </div>
                                </th>
                                <th
                                    style={{ cursor: 'pointer', userSelect: 'none' }}
                                    onClick={() => requestSort('amount')}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        Amount
                                        {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                    </div>
                                </th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        No transactions found matching filters
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.slice(0, 50).map(t => {
                                    const account = accounts.find(a => a.id === t.AccountId);
                                    return (
                                        <tr key={t.id}>
                                            <td>{t.transactionDate ? new Date(t.transactionDate).toLocaleDateString() : '-'}</td>
                                            <td style={{ fontWeight: '600' }}>{account ? account.name : '-'}</td>
                                            <td>{t.notes || t.description || '-'}</td>
                                            <td style={{ fontWeight: '600', color: t.type === 'deposit' || t.amount > 0 ? 'var(--accent)' : '#ef4444' }}>
                                                {formatIndianRupee(Number(t.amount))}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button className="action-btn edit" onClick={() => handleEditTxn(t)}><Edit2 size={14} /></button>
                                                    <button className="action-btn delete" onClick={() => handleDeleteTxn(t.id)}><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isRateModalOpen && (
                <div className="modal-overlay">
                    <div className="modal" style={{ width: '450px' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2>{editingRate ? 'Edit Interest Rate' : 'Add Interest Rate'}</h2>
                        </div>
                        <form onSubmit={handleRateSubmit}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Instrument Type</label>
                                <select
                                    value={rateFormData.instrumentType}
                                    onChange={e => setRateFormData({ ...rateFormData, instrumentType: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                                >
                                    <option value="pf">PF</option>
                                    <option value="ppf">PPF</option>
                                    <option value="ssy">SSY</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Interest Rate (%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={rateFormData.rate}
                                    onChange={e => setRateFormData({ ...rateFormData, rate: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Effective From</label>
                                <input
                                    type="date"
                                    value={rateFormData.effectiveFrom}
                                    onChange={e => setRateFormData({ ...rateFormData, effectiveFrom: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ flex: 1, padding: '0.75rem' }}
                                    onClick={() => setIsRateModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn"
                                    style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Save Rate'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isSchemeModalOpen && (
                <div className="modal-overlay">
                    <div className="modal" style={{ width: '450px' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2>Add New Scheme Account</h2>
                        </div>
                        <form onSubmit={handleSchemeSubmit}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Account Name</label>
                                <input
                                    type="text"
                                    value={schemeFormData.name}
                                    onChange={e => setSchemeFormData({ ...schemeFormData, name: e.target.value })}
                                    required
                                    placeholder="e.g. My PPF Account"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Scheme Type</label>
                                <select
                                    value={schemeFormData.type}
                                    onChange={e => setSchemeFormData({ ...schemeFormData, type: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                                >
                                    <option value="pf">Provident Fund (PF)</option>
                                    <option value="ppf">Public Provident Fund (PPF)</option>
                                    <option value="ssy">Sukanya Samriddhi (SSY)</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Institution / Bank</label>
                                <input
                                    type="text"
                                    value={schemeFormData.institution}
                                    onChange={e => setSchemeFormData({ ...schemeFormData, institution: e.target.value })}
                                    placeholder="e.g. SBI, HDFC"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ flex: 1, padding: '0.75rem' }}
                                    onClick={() => setIsSchemeModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn"
                                    style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
                                    disabled={loading}
                                >
                                    {loading ? 'Creating...' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isTxnModalOpen && (
                <div className="modal-overlay">
                    <div className="modal" style={{ width: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2>{editingTxn ? 'Edit Transaction' : 'Add Transaction'}</h2>
                        </div>
                        <form onSubmit={handleTxnSubmit}>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Date</label>
                                <input
                                    type="date"
                                    value={txnFormData.transactionDate}
                                    onChange={e => setTxnFormData({ ...txnFormData, transactionDate: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Account</label>
                                <select
                                    value={txnFormData.AccountId}
                                    onChange={e => setTxnFormData({ ...txnFormData, AccountId: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name} ({getInstrumentLabel(acc.type)})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Transaction Type</label>
                                <select
                                    value={txnFormData.type}
                                    onChange={e => setTxnFormData({ ...txnFormData, type: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                                >
                                    <option value="deposit">Deposit (Contribution)</option>
                                    <option value="withdrawal">Withdrawal</option>
                                    <option value="interest">Interest Credit</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Amount (₹)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={txnFormData.amount}
                                    onChange={e => setTxnFormData({ ...txnFormData, amount: e.target.value })}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Notes / Description</label>
                                <input
                                    type="text"
                                    value={txnFormData.notes}
                                    onChange={e => setTxnFormData({ ...txnFormData, notes: e.target.value })}
                                    placeholder="Optional description"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="form-actions" style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ flex: 1, padding: '0.75rem' }}
                                    onClick={() => setIsTxnModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn"
                                    style={{ flex: 1, padding: '0.75rem', justifyContent: 'center' }}
                                    disabled={loading}
                                >
                                    {loading ? 'Saving...' : 'Save Transaction'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default GovtSchemes;
