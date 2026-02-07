import React, { useState, useEffect } from 'react';
import { Plus, Filter, Download, TrendingUp, TrendingDown } from 'lucide-react';
import axios from 'axios';
import { formatIndianRupee } from '../utils/formatCurrency';
import api from '../services/api';

function Cashflow() {
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState('all');
    const [selectedAccountType, setSelectedAccountType] = useState('all');
    const [period, setPeriod] = useState('fy'); // monthly, fy, custom - default to FY
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(2025); // Default to FY 2025-26
    const [customRange, setCustomRange] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [sortConfig, setSortConfig] = useState({ field: 'transactionDate', order: 'DESC' });
    const [columnFilters, setColumnFilters] = useState({
        transactionDate: '',
        'Account.name': '',
        'CashflowCategory.name': '',
        description: '',
        type: '',
        amount: ''
    });

    const [formData, setFormData] = useState({
        AccountId: '',
        CashflowCategoryId: '',
        amount: '',
        transactionDate: new Date().toISOString().split('T')[0],
        description: '',
        type: 'expense',
        fromAccountId: '',
        toAccountId: '',
        scrip: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, [selectedAccount, period, selectedMonth, selectedYear, customRange, sortConfig, columnFilters]);

    const handleSort = (field) => {
        setSortConfig(prev => ({
            field,
            order: prev.field === field && prev.order === 'DESC' ? 'ASC' : 'DESC'
        }));
    };

    const fetchInitialData = async () => {
        try {
            const [accRes, catRes] = await Promise.all([
                api.get('/accounts'),
                api.get('/categories')
            ]);

            setAccounts(accRes.data);
            setCategories(catRes.data);

            // Fetch transactions based on period
            let startDate, endDate;
            if (period === 'monthly') {
                startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
                const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
                endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${lastDay}`;
            } else if (period === 'fy') {
                // Financial Year (April to March)
                // If selected year is 2025, FY 2025-26 starts April 2025
                startDate = `${selectedYear}-04-01`;
                endDate = `${selectedYear + 1}-03-31`;
            } else {
                startDate = customRange.startDate;
                endDate = customRange.endDate;
            }

            // Fetch summary for selected range
            const summaryRes = await api.get('/cashflow/summary', {
                params: {
                    accountId: selectedAccount,
                    startDate,
                    endDate
                }
            });
            setSummary(summaryRes.data);

            let params = {
                startDate,
                endDate,
                sortField: sortConfig.field,
                sortOrder: sortConfig.order
            };

            let txnRes;
            if (selectedAccount !== 'all') {
                params.accountId = selectedAccount;
                txnRes = await api.get(`/cashflow/ledger/${selectedAccount}`, { params });
                // For ledger, the data is in txnRes.data.ledger
                setTransactions(txnRes.data.ledger || []);
            } else {
                txnRes = await api.get('/cashflow', { params });
                // Calculate running balance for consolidated view
                let currentBal = summaryRes.data.openingBalance || 0;
                const txnsWithBal = (txnRes.data || []).map(txn => {
                    const debit = parseFloat(txn.debit || 0);
                    const credit = parseFloat(txn.credit || 0);
                    currentBal += (credit - debit);
                    return { ...txn, runningBalance: currentBal };
                });
                setTransactions(txnsWithBal);
            }

            // Set default account if not set
            if (accRes.data.length > 0 && !formData.AccountId) {
                setFormData(prev => ({ ...prev, AccountId: accRes.data[0].id }));
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (formData.type === 'transfer') {
                // Handle transfer
                await api.post('/cashflow/transfer', {
                    fromAccountId: formData.fromAccountId,
                    toAccountId: formData.toAccountId,
                    amount: formData.amount,
                    transactionDate: formData.transactionDate,
                    description: formData.description
                });
            } else {
                // Handle regular income/expense
                await api.post('/cashflow', formData);
            }
            setIsModalOpen(false);
            setFormData({
                AccountId: formData.AccountId,
                CashflowCategoryId: '',
                amount: '',
                transactionDate: new Date().toISOString().split('T')[0],
                description: '',
                type: 'expense',
                fromAccountId: '',
                toAccountId: '',
                scrip: ''
            });
            fetchInitialData();
        } catch (err) {
            alert('Error adding transaction: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const filteredCategories = categories.filter(c => c.type === formData.type);

    return (
        <>
            <section className="journal-section">
                <div className="header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2>Cashflow Statement</h2>
                        <p style={{ color: 'var(--text-muted)' }}>
                            Track income and expenses by account
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button className="btn" onClick={() => setIsModalOpen(true)}>
                            <Plus size={18} style={{ marginRight: '8px' }} /> Add Transaction
                        </button>
                        <button className="btn-secondary" onClick={() => {
                            setColumnFilters({
                                transactionDate: '',
                                'Account.name': '',
                                'CashflowCategory.name': '',
                                description: '',
                                type: '',
                                amount: ''
                            });
                            setSortConfig({ field: 'transactionDate', order: 'DESC' });
                        }}>
                            Clear Filters
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                Period Type:
                            </label>
                            <select
                                value={period}
                                onChange={e => setPeriod(e.target.value)}
                                style={{
                                    padding: '0.5rem',
                                    background: 'var(--bg-color)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '0.375rem',
                                    color: 'var(--text-main)',
                                    outline: 'none',
                                    minWidth: '120px'
                                }}
                            >
                                <option value="monthly">Monthly</option>
                                <option value="fy">Financial Year</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>

                        {period === 'monthly' && (
                            <>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                        Month:
                                    </label>
                                    <select
                                        value={selectedMonth}
                                        onChange={e => setSelectedMonth(parseInt(e.target.value))}
                                        style={{
                                            padding: '0.5rem',
                                            background: 'var(--bg-color)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '0.375rem',
                                            color: 'var(--text-main)',
                                            outline: 'none'
                                        }}
                                    >
                                        {months.map((month, idx) => (
                                            <option key={idx} value={idx + 1} style={{ background: 'var(--card-bg)', color: 'var(--text-main)' }}>{month}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                        Year:
                                    </label>
                                    <select
                                        value={selectedYear}
                                        onChange={e => setSelectedYear(parseInt(e.target.value))}
                                        style={{
                                            padding: '0.5rem',
                                            background: 'var(--bg-color)',
                                            border: '1px solid var(--border)',
                                            borderRadius: '0.375rem',
                                            color: 'var(--text-main)',
                                            outline: 'none'
                                        }}
                                    >
                                        {[2024, 2025, 2026, 2027].map(year => (
                                            <option key={year} value={year} style={{ background: 'var(--card-bg)', color: 'var(--text-main)' }}>{year}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        {period === 'fy' && (
                            <div>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                    FY Starting:
                                </label>
                                <select
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                                    style={{
                                        padding: '0.5rem',
                                        background: 'var(--bg-color)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '0.375rem',
                                        color: 'var(--text-main)',
                                        outline: 'none'
                                    }}
                                >
                                    {[2024, 2025, 2026, 2027].map(year => (
                                        <option key={year} value={year} style={{ background: 'var(--card-bg)', color: 'var(--text-main)' }}>FY {year}-{year + 1}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {period === 'custom' && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                        Start Date:
                                    </label>
                                    <input
                                        type="date"
                                        value={customRange.startDate}
                                        onChange={e => setCustomRange({ ...customRange, startDate: e.target.value })}
                                        style={{ padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                        End Date:
                                    </label>
                                    <input
                                        type="date"
                                        value={customRange.endDate}
                                        onChange={e => setCustomRange({ ...customRange, endDate: e.target.value })}
                                        style={{ padding: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                        )}

                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                                Account:
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {/* Account Type Filter */}
                                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '0.5rem', flexWrap: 'wrap' }}>
                                    {['all', ...new Set(accounts.filter(a => !a.isArchived).map(a => a.type))].map(type => (
                                        <button
                                            key={type}
                                            className={`nav-item ${selectedAccountType === type ? 'active' : ''}`}
                                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', border: 'none', background: 'none', textTransform: 'uppercase' }}
                                            onClick={() => {
                                                setSelectedAccountType(type);
                                                setSelectedAccount('all'); // Reset account selection when type changes
                                            }}
                                        >
                                            {type === 'all' ? 'ALL TYPES' : type}
                                        </button>
                                    ))}
                                </div>

                                {/* Account List (Filtered) */}
                                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '0.5rem', display: 'inline-flex', flexWrap: 'wrap' }}>
                                    <button
                                        className={`nav-item ${selectedAccount === 'all' ? 'active' : ''}`}
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', border: 'none', background: 'none' }}
                                        onClick={() => setSelectedAccount('all')}
                                    >
                                        ALL ACCOUNTS
                                    </button>
                                    {accounts
                                        .filter(acc => !acc.isArchived && (selectedAccountType === 'all' || acc.type === selectedAccountType))
                                        .map(acc => (
                                            <button
                                                key={acc.id}
                                                className={`nav-item ${selectedAccount === acc.id ? 'active' : ''}`}
                                                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', border: 'none', background: 'none' }}
                                                onClick={() => setSelectedAccount(acc.id)}
                                            >
                                                {acc.name.toUpperCase()}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                {summary && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="card" style={{ padding: '1.25rem' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                Total Income
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--accent)' }}>
                                {formatIndianRupee(summary.totalIncome)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                {summary.transactionCount} transactions
                            </div>
                        </div>
                        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                Total Expenses
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ef4444' }}>
                                {formatIndianRupee(summary.totalExpense)}
                            </div>
                        </div>
                        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--accent)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                Net Cashflow
                            </div>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: '600',
                                color: summary.netCashflow >= 0 ? 'var(--accent)' : '#ef4444'
                            }}>
                                {summary.netCashflow >= 0 ? '+' : ''}{formatIndianRupee(summary.netCashflow)}
                            </div>
                        </div>
                        {selectedAccount !== 'all' && (
                            <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    Closing Balance
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--text-main)' }}>
                                    {formatIndianRupee(summary.closingBalance || 0)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Final balance for this period
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Transactions Table */}
                <div className="card">
                    <h3 style={{ marginBottom: '1rem' }}>Transactions</h3>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('transactionDate')} style={{ cursor: 'pointer' }}>
                                        Date {sortConfig.field === 'transactionDate' && (sortConfig.order === 'ASC' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('Account.name')} style={{ cursor: 'pointer' }}>
                                        Account {sortConfig.field === 'Account.name' && (sortConfig.order === 'ASC' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('CashflowCategory.name')} style={{ cursor: 'pointer' }}>
                                        Category {sortConfig.field === 'CashflowCategory.name' && (sortConfig.order === 'ASC' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('description')} style={{ cursor: 'pointer' }}>
                                        Description {sortConfig.field === 'description' && (sortConfig.order === 'ASC' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                                        Type {sortConfig.field === 'type' && (sortConfig.order === 'ASC' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('debit')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                                        Debit (Out) {sortConfig.field === 'debit' && (sortConfig.order === 'ASC' ? '↑' : '↓')}
                                    </th>
                                    <th onClick={() => handleSort('credit')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                                        Credit (In) {sortConfig.field === 'credit' && (sortConfig.order === 'ASC' ? '↑' : '↓')}
                                    </th>
                                    <th style={{ textAlign: 'right' }}>Balance</th>
                                </tr>
                                <tr>
                                    <th style={{ padding: '0.5rem' }}>
                                        <input
                                            type="text"
                                            className="filter-input"
                                            placeholder="Date..."
                                            value={columnFilters.transactionDate}
                                            onChange={e => setColumnFilters({ ...columnFilters, transactionDate: e.target.value })}
                                        />
                                    </th>
                                    <th style={{ padding: '0.5rem' }}>
                                        <input
                                            type="text"
                                            className="filter-input"
                                            placeholder="Account..."
                                            value={columnFilters['Account.name']}
                                            onChange={e => setColumnFilters({ ...columnFilters, 'Account.name': e.target.value })}
                                        />
                                    </th>
                                    <th style={{ padding: '0.5rem' }}>
                                        <input
                                            type="text"
                                            className="filter-input"
                                            placeholder="Category..."
                                            value={columnFilters['CashflowCategory.name']}
                                            onChange={e => setColumnFilters({ ...columnFilters, 'CashflowCategory.name': e.target.value })}
                                        />
                                    </th>
                                    <th style={{ padding: '0.5rem' }}>
                                        <input
                                            type="text"
                                            className="filter-input"
                                            placeholder="Description..."
                                            value={columnFilters.description}
                                            onChange={e => setColumnFilters({ ...columnFilters, description: e.target.value })}
                                        />
                                    </th>
                                    <th style={{ padding: '0.5rem' }}>
                                        <input
                                            type="text"
                                            className="filter-input"
                                            placeholder="Type..."
                                            value={columnFilters.type}
                                            onChange={e => setColumnFilters({ ...columnFilters, type: e.target.value })}
                                        />
                                    </th>
                                    <th style={{ padding: '0.25rem' }}></th>
                                    <th style={{ padding: '0.25rem' }}></th>
                                    <th style={{ padding: '0.25rem' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {summary?.openingBalance !== undefined && (
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', fontWeight: '600' }}>
                                        <td>-</td>
                                        <td style={{ color: 'var(--text-muted)' }}>-</td>
                                        <td style={{ color: 'var(--primary)' }}>PERIOD OPENING BALANCE</td>
                                        <td style={{ color: 'var(--text-muted)' }}>Balance at start of selected period</td>
                                        <td><span className="type-tag" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>POB</span></td>
                                        <td style={{ textAlign: 'right' }}>-</td>
                                        <td style={{ textAlign: 'right' }}>-</td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-main)' }}>{formatIndianRupee(parseFloat(summary.openingBalance))}</td>
                                    </tr>
                                )}
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                                            No transactions found for this period
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map(txn => (
                                        <tr key={txn.id}>
                                            <td>{txn.transactionDate}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>
                                                {txn.Account?.name}
                                            </td>
                                            <td style={{ fontWeight: '600' }}>
                                                {txn.CashflowCategory?.name}
                                            </td>
                                            <td style={{ color: 'var(--text-muted)' }}>
                                                {txn.description || '-'}
                                            </td>
                                            <td>
                                                <span className={`type-tag ${txn.type === 'income' ? 'type-dividend' :
                                                    txn.type === 'expense' ? 'type-sell' :
                                                        'type-buy'
                                                    }`}>
                                                    {txn.type}
                                                </span>
                                            </td>
                                            <td style={{
                                                fontWeight: '600',
                                                color: '#ef4444',
                                                textAlign: 'right'
                                            }}>
                                                {parseFloat(txn.debit) > 0 ? formatIndianRupee(parseFloat(txn.debit)) : '-'}
                                            </td>
                                            <td style={{
                                                fontWeight: '600',
                                                color: 'var(--accent)',
                                                textAlign: 'right'
                                            }}>
                                                {parseFloat(txn.credit) > 0 ? formatIndianRupee(parseFloat(txn.credit)) : '-'}
                                            </td>
                                            <td style={{
                                                fontWeight: '600',
                                                textAlign: 'right',
                                                color: 'var(--text-main)'
                                            }}>
                                                {formatIndianRupee(txn.runningBalance)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                                {summary?.closingBalance !== undefined && (
                                    <tr style={{ background: 'rgba(255,255,255,0.02)', fontWeight: '600' }}>
                                        <td>-</td>
                                        <td style={{ color: 'var(--text-muted)' }}>-</td>
                                        <td style={{ color: 'var(--accent)' }}>PERIOD CLOSING BALANCE</td>
                                        <td style={{ color: 'var(--text-muted)' }}>Final balance for this period</td>
                                        <td><span className="type-tag" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent)' }}>PCB</span></td>
                                        <td style={{ textAlign: 'right' }}>-</td>
                                        <td style={{ textAlign: 'right' }}>-</td>
                                        <td style={{ textAlign: 'right', color: 'var(--text-main)' }}>{formatIndianRupee(parseFloat(summary.closingBalance))}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Add Transaction Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Add Cashflow Transaction</h2>
                        <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {formData.type === 'transfer' ? (
                                    <>
                                        <div className="form-group">
                                            <label>From Account</label>
                                            <select
                                                value={formData.fromAccountId}
                                                onChange={e => setFormData({ ...formData, fromAccountId: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Account</option>
                                                {accounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>To Account</label>
                                            <select
                                                value={formData.toAccountId}
                                                onChange={e => setFormData({ ...formData, toAccountId: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Account</option>
                                                {accounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="form-group">
                                            <label>Account</label>
                                            <select
                                                value={formData.AccountId}
                                                onChange={e => setFormData({ ...formData, AccountId: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Account</option>
                                                {accounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Type</label>
                                            <select
                                                value={formData.type}
                                                onChange={e => setFormData({ ...formData, type: e.target.value, CashflowCategoryId: '' })}
                                            >
                                                <option value="income">Income</option>
                                                <option value="expense">Expense</option>
                                                <option value="transfer">Transfer</option>
                                            </select>
                                        </div>
                                    </>
                                )}
                            </div>
                            {formData.type !== 'transfer' && (
                                <div className="form-group">
                                    <label>Category</label>
                                    <select
                                        value={formData.CashflowCategoryId}
                                        onChange={e => setFormData({ ...formData, CashflowCategoryId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {filteredCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        required
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Date</label>
                                    <input
                                        type="date"
                                        value={formData.transactionDate}
                                        onChange={e => setFormData({ ...formData, transactionDate: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            {formData.type !== 'transfer' && (
                                <>
                                    {/* Show scrip field only for Dividend category */}
                                    {categories.find(c => c.id === formData.CashflowCategoryId)?.name === 'Dividend' && (
                                        <div className="form-group">
                                            <label>Scrip / Stock Symbol (Optional)</label>
                                            <input
                                                type="text"
                                                value={formData.scrip}
                                                onChange={e => setFormData({ ...formData, scrip: e.target.value.toUpperCase() })}
                                                placeholder="e.g. RELIANCE, TCS, HDFCBANK"
                                                style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--text-main)' }}
                                            />
                                        </div>
                                    )}
                                </>
                            )}
                            <div className="form-group">
                                <label>Description (Optional)</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows="3"
                                    placeholder="Add notes about this transaction..."
                                    style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-color)', border: '1px solid var(--border)', borderRadius: '0.375rem', color: 'var(--text-main)', fontFamily: 'inherit' }}
                                />
                            </div>
                            <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    style={{ flex: 1 }}
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn"
                                    style={{ flex: 1 }}
                                    disabled={loading}
                                >
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

export default Cashflow;
