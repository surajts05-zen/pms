import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Plus, Trash2, X, AlertCircle, CheckCircle2, Landmark, Filter, Search, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import { formatIndianRupee } from '../utils/formatCurrency';
import api from '../services/api';

const AccountingJournals = () => {
    const [journals, setJournals] = useState([]);
    const [coa, setCoa] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editJournalId, setEditJournalId] = useState(null);
    const [fdModalType, setFdModalType] = useState(null); // 'create' | 'interest' | 'tds' | 'mature'

    // Expanded Row State
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Filter State
    const [filters, setFilters] = useState({
        search: '',
        startDate: '',
        endDate: '',
        minAmount: '',
        maxAmount: '',
        accountId: '',
        referenceType: '',
        accountType: ''
    });
    const [showFilters, setShowFilters] = useState(false);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'transactionDate', direction: 'desc' });

    // FD Quick Action Form State
    const [fdForm, setFdForm] = useState({
        transactionDate: new Date().toISOString().split('T')[0],
        fdAccountId: '',
        bankAccountId: '',
        interestIncomeAccountId: '',
        tdsAccountId: '',
        amount: '',
        grossInterest: '',
        tdsAmount: '',
        description: ''
    });

    // New Journal Form State
    const [formData, setFormData] = useState({
        transactionDate: new Date().toISOString().split('T')[0],
        description: '',
        postings: [
            { ledgerAccountId: '', debit: 0, credit: 0 },
            { ledgerAccountId: '', debit: 0, credit: 0 }
        ]
    });

    // Helper to filter accounts
    const getAccountsBySubType = (subTypes) => coa.filter(a => subTypes.includes(a.subType));
    const getBankAccounts = () => coa.filter(a => a.subType === 'bank' || a.linkedType === 'Account');
    const getFdAccounts = () => coa.filter(a => a.name?.includes('Fixed Deposit') || a.name?.includes('Recurring Deposit'));
    const getInterestIncomeAccounts = () => coa.filter(a => a.name?.includes('Interest Income') || a.subType === 'Other Income');
    const getTdsAccounts = () => coa.filter(a => a.name?.includes('TDS'));

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [journalRes, coaRes] = await Promise.all([
                api.get('/accounting/journals'),
                api.get('/accounting/coa')
            ]);
            setJournals(journalRes.data);
            setCoa(coaRes.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching data:', err);
            setLoading(false);
        }
    };

    // Derived unique reference types for filter dropdown
    const uniqueReferenceTypes = useMemo(() => {
        const types = new Set(journals.map(j => j.referenceType || 'Manual'));
        return Array.from(types).sort();
    }, [journals]);

    // Sorting Helper
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter and Sort Logic
    const filteredJournals = useMemo(() => {
        let result = journals.filter(journal => {
            // Search (Description or ID)
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                if (!journal.description?.toLowerCase().includes(searchLower) &&
                    !journal.id.toLowerCase().includes(searchLower)) {
                    return false;
                }
            }

            // Date Range
            if (filters.startDate && journal.transactionDate < filters.startDate) return false;
            if (filters.endDate && journal.transactionDate > filters.endDate) return false;

            // Amount Range (Total Debit of the journal)
            const totalAmount = journal.LedgerPostings.reduce((sum, p) => sum + parseFloat(p.debit), 0);
            if (filters.minAmount && totalAmount < parseFloat(filters.minAmount)) return false;
            if (filters.maxAmount && totalAmount > parseFloat(filters.maxAmount)) return false;

            // Account Filter
            if (filters.accountId) {
                const hasAccount = journal.LedgerPostings.some(p => p.ledgerAccountId === filters.accountId);
                if (!hasAccount) return false;
            }

            // Reference Type Filter
            if (filters.referenceType) {
                const currentType = journal.referenceType || 'Manual';
                if (currentType !== filters.referenceType) return false;
            }

            // Account Type Filter (e.g. show journals containing an Expense account)
            if (filters.accountType) {
                const hasAccountType = journal.LedgerPostings.some(p => p.LedgerAccount?.type === filters.accountType);
                if (!hasAccountType) return false;
            }

            return true;
        });

        // Sorting
        return result.sort((a, b) => {
            if (sortConfig.key === 'amount') {
                const amountA = a.LedgerPostings.reduce((sum, p) => sum + parseFloat(p.debit), 0);
                const amountB = b.LedgerPostings.reduce((sum, p) => sum + parseFloat(p.debit), 0);
                return sortConfig.direction === 'asc' ? amountA - amountB : amountB - amountA;
            }

            let valA = a[sortConfig.key] || '';
            let valB = b[sortConfig.key] || '';

            if (sortConfig.key === 'referenceType') {
                valA = a.referenceType || 'Manual';
                valB = b.referenceType || 'Manual';
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [journals, filters, sortConfig]);

    const toggleRow = (id) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };


    const addPostingLine = () => {
        setFormData({
            ...formData,
            postings: [...formData.postings, { ledgerAccountId: '', debit: 0, credit: 0 }]
        });
    };

    const removePostingLine = (index) => {
        const newPostings = formData.postings.filter((_, i) => i !== index);
        setFormData({ ...formData, postings: newPostings });
    };

    const handlePostingChange = (index, field, value) => {
        const newPostings = [...formData.postings];
        newPostings[index][field] = value;

        // If typing debit, clear credit and vice versa
        if (field === 'debit' && parseFloat(value) > 0) newPostings[index].credit = 0;
        if (field === 'credit' && parseFloat(value) > 0) newPostings[index].debit = 0;

        setFormData({ ...formData, postings: newPostings });
    };

    const totalDebit = formData.postings.reduce((sum, p) => sum + parseFloat(p.debit || 0), 0);
    const totalCredit = formData.postings.reduce((sum, p) => sum + parseFloat(p.credit || 0), 0);
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

    const handleEdit = (journal) => {
        setFormData({
            transactionDate: journal.transactionDate,
            description: journal.description,
            postings: journal.LedgerPostings.map(p => ({
                ledgerAccountId: p.ledgerAccountId,
                debit: parseFloat(p.debit),
                credit: parseFloat(p.credit)
            }))
        });
        setEditJournalId(journal.id);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setIsModalOpen(false);
        setEditJournalId(null);
        setFormData({
            transactionDate: new Date().toISOString().split('T')[0],
            description: '',
            postings: [
                { ledgerAccountId: '', debit: 0, credit: 0 },
                { ledgerAccountId: '', debit: 0, credit: 0 }
            ]
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isBalanced) return alert('Journal must be balanced (Total Debits = Total Credits)');

        try {
            if (editJournalId) {
                await api.put(`/accounting/journals/${editJournalId}`, formData);
            } else {
                await api.post('/accounting/journals', formData);
            }
            resetForm();
            fetchInitialData();
        } catch (err) {
            alert('Error saving journal: ' + (err.response?.data?.error || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this journal entry?')) return;
        try {
            await api.delete(`/accounting/journals/${id}`);
            fetchInitialData();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    const resetFdForm = () => {
        setFdForm({
            transactionDate: new Date().toISOString().split('T')[0],
            fdAccountId: '',
            bankAccountId: '',
            interestIncomeAccountId: '',
            tdsAccountId: '',
            amount: '',
            grossInterest: '',
            tdsAmount: '',
            description: ''
        });
        setFdModalType(null);
    };

    const handleFdSubmit = async (e) => {
        e.preventDefault();
        try {
            let endpoint = '';
            let payload = { transactionDate: fdForm.transactionDate, description: fdForm.description };

            switch (fdModalType) {
                case 'create':
                    endpoint = '/accounting/fd/create';
                    payload = { ...payload, fdAccountId: fdForm.fdAccountId, bankAccountId: fdForm.bankAccountId, amount: fdForm.amount };
                    break;
                case 'interest':
                    endpoint = '/accounting/fd/accrue-interest';
                    payload = { ...payload, fdAccountId: fdForm.fdAccountId, interestIncomeAccountId: fdForm.interestIncomeAccountId, amount: fdForm.amount };
                    break;
                case 'tds':
                    endpoint = '/accounting/fd/tds';
                    payload = { ...payload, fdAccountId: fdForm.fdAccountId, tdsAccountId: fdForm.tdsAccountId, interestIncomeAccountId: fdForm.interestIncomeAccountId, grossInterest: fdForm.grossInterest, tdsAmount: fdForm.tdsAmount };
                    break;
                case 'mature':
                    endpoint = '/accounting/fd/mature';
                    payload = { ...payload, fdAccountId: fdForm.fdAccountId, bankAccountId: fdForm.bankAccountId, amount: fdForm.amount };
                    break;
                default:
                    return;
            }

            await api.post(endpoint, payload);
            resetFdForm();
            fetchInitialData();
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message));
        }
    };

    if (loading) return <div className="loading">Loading Journal Entries...</div>;

    return (
        <section className="journal-section" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header Area */}
            <div className="header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Accounting Journals</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Double-entry ledger history</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn outline" onClick={() => setFdModalType('create')} title="Create FD">
                        <Landmark size={16} /> FD
                    </button>
                    <button className="btn outline" onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} /> New Journal
                    </button>
                </div>
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
                            placeholder="Search description or ID..."
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
                                {coa.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem' }}>Account Type</label>
                            <select
                                value={filters.accountType}
                                onChange={(e) => setFilters({ ...filters, accountType: e.target.value })}
                                style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                            >
                                <option value="">All Types</option>
                                {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: '0.75rem' }}>Type</label>
                            <select
                                value={filters.referenceType}
                                onChange={(e) => setFilters({ ...filters, referenceType: e.target.value })}
                                style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                            >
                                <option value="">All Types</option>
                                {uniqueReferenceTypes.map(t => <option key={t} value={t}>{t}</option>)}
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

            {/* Journal Table */}
            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-color)', zIndex: 10 }}>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', width: '40px' }}></th>
                            <th
                                style={{ padding: '0.75rem 1rem', textAlign: 'left', width: '120px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => requestSort('transactionDate')}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    Date
                                    {sortConfig.key === 'transactionDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th
                                style={{ padding: '0.75rem 1rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => requestSort('description')}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    Reference / Description
                                    {sortConfig.key === 'description' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th
                                style={{ padding: '0.75rem 1rem', textAlign: 'left', width: '200px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => requestSort('referenceType')}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    Type
                                    {sortConfig.key === 'referenceType' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th
                                style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '150px', cursor: 'pointer', userSelect: 'none' }}
                                onClick={() => requestSort('amount')}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                    Amount
                                    {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                                </div>
                            </th>
                            <th style={{ padding: '0.75rem 1rem', textAlign: 'right', width: '100px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredJournals.length > 0 ? (
                            filteredJournals.map(journal => {
                                const totalAmount = journal.LedgerPostings.reduce((sum, p) => sum + parseFloat(p.debit), 0);
                                const isExpanded = expandedRows.has(journal.id);

                                return (
                                    <React.Fragment key={journal.id}>
                                        <tr
                                            onClick={() => toggleRow(journal.id)}
                                            style={{
                                                borderBottom: isExpanded ? 'none' : '1px solid var(--border)',
                                                cursor: 'pointer',
                                                background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                                                transition: 'background 0.2s'
                                            }}
                                            className="journal-row"
                                        >
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-main)' }}>{journal.transactionDate}</td>
                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                <div style={{ fontWeight: '500', color: 'var(--text-main)' }}>{journal.description}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{journal.referenceType} #{journal.referenceId?.slice(0, 8)}</div>
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                                                {journal.referenceType || 'Manual'}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: '600' }}>
                                                {formatIndianRupee(totalAmount)}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                    <button className="action-btn" onClick={() => handleEdit(journal)} title="Edit">
                                                        <Landmark size={14} />
                                                    </button>
                                                    <button className="action-btn delete" onClick={() => handleDelete(journal.id)} title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                                                <td colSpan={6} style={{ padding: '0 1rem 1rem 3rem' }}>
                                                    <div style={{
                                                        background: 'rgba(0,0,0,0.2)',
                                                        borderRadius: '0.5rem',
                                                        padding: '0.5rem',
                                                        border: '1px solid var(--border)'
                                                    }}>
                                                        <table style={{ width: '100%', fontSize: '0.8rem' }}>
                                                            <thead>
                                                                <tr>
                                                                    <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)' }}>Ledger Account</th>
                                                                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--text-muted)' }}>Debit</th>
                                                                    <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--text-muted)' }}>Credit</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {journal.LedgerPostings.map(post => (
                                                                    <tr key={post.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                                        <td style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                            {post.LedgerAccount?.name}
                                                                            <span style={{
                                                                                fontSize: '0.7rem',
                                                                                padding: '0.1rem 0.3rem',
                                                                                borderRadius: '0.2rem',
                                                                                background: 'rgba(255,255,255,0.1)',
                                                                                color: 'var(--text-muted)'
                                                                            }}>
                                                                                {post.LedgerAccount?.type}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ padding: '0.5rem', textAlign: 'right', color: parseFloat(post.debit) > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                                                                            {parseFloat(post.debit) > 0 ? formatIndianRupee(post.debit) : '-'}
                                                                        </td>
                                                                        <td style={{ padding: '0.5rem', textAlign: 'right', color: parseFloat(post.credit) > 0 ? '#ef4444' : 'var(--text-muted)' }}>
                                                                            {parseFloat(post.credit) > 0 ? formatIndianRupee(post.credit) : '-'}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No journal entries found matching your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal - Same as before but kept for context */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '900px', width: '95%', padding: '2.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-main)' }}>
                                    {editJournalId ? 'Edit Journal Entry' : 'Manual Journal Entry'}
                                </h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    {editJournalId ? `Editing journal ID: ${editJournalId.split('-')[0]}...` : 'Create a new double-entry record'}
                                </p>
                            </div>
                            <button className="action-btn" onClick={resetForm} style={{ padding: '0.5rem', borderRadius: '50%' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '1.5rem',
                                marginBottom: '2.5rem',
                                background: 'rgba(255,255,255,0.02)',
                                padding: '1.5rem',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--border)'
                            }}>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Transaction Date</label>
                                    <input
                                        type="date"
                                        value={formData.transactionDate}
                                        onChange={e => setFormData({ ...formData, transactionDate: e.target.value })}
                                        required
                                        style={{ background: 'var(--bg-color)', border: '1px solid var(--border)' }}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label style={{ fontWeight: '600', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Description / Narration</label>
                                    <input
                                        type="text"
                                        placeholder="Enter journal description..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        required
                                        style={{ background: 'var(--bg-color)', border: '1px solid var(--border)' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr auto',
                                    gap: '1rem',
                                    padding: '0 1rem 0.75rem 1rem',
                                    borderBottom: '1px solid var(--border)',
                                    marginBottom: '1rem'
                                }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Debit</span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Credit</span>
                                    <span style={{ width: '32px' }}></span>
                                </div>

                                <div style={{ maxHeight: '350px', overflowY: 'auto', padding: '0 0.5rem' }}>
                                    {formData.postings.map((post, index) => (
                                        <div key={index} style={{
                                            display: 'grid',
                                            gridTemplateColumns: '2fr 1fr 1fr auto',
                                            gap: '1rem',
                                            alignItems: 'center',
                                            marginBottom: '0.75rem',
                                            padding: '0.5rem',
                                            borderRadius: '0.5rem',
                                            transition: 'background 0.2s'
                                        }}>
                                            <select
                                                value={post.ledgerAccountId}
                                                onChange={e => handlePostingChange(index, 'ledgerAccountId', e.target.value)}
                                                required
                                                style={{
                                                    background: 'var(--bg-color)',
                                                    border: '1px solid var(--border)',
                                                    padding: '0.75rem',
                                                    width: '100%',
                                                    color: 'var(--text-main)',
                                                    borderRadius: '0.5rem'
                                                }}
                                            >
                                                <option value="">Select Account</option>
                                                {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(type => (
                                                    <optgroup key={type} label={type}>
                                                        {coa.filter(a => a.type === type).map(a => (
                                                            <option key={a.id} value={a.id}>
                                                                {a.name} {a.subType ? `(${a.subType})` : ''}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                            <div style={{ width: '100%' }}>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={post.debit || ''}
                                                    onChange={e => handlePostingChange(index, 'debit', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        textAlign: 'right',
                                                        border: post.debit > 0 ? '1px solid var(--accent)' : '1px solid var(--border)',
                                                        background: post.debit > 0 ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-color)',
                                                        color: post.debit > 0 ? 'var(--accent)' : 'inherit',
                                                        fontWeight: post.debit > 0 ? '600' : '400',
                                                        padding: '0.75rem',
                                                        borderRadius: '0.5rem'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ width: '100%' }}>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={post.credit || ''}
                                                    onChange={e => handlePostingChange(index, 'credit', e.target.value)}
                                                    style={{
                                                        width: '100%',
                                                        textAlign: 'right',
                                                        border: post.credit > 0 ? '1px solid #ef4444' : '1px solid var(--border)',
                                                        background: post.credit > 0 ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-color)',
                                                        color: post.credit > 0 ? '#ef4444' : 'inherit',
                                                        fontWeight: post.credit > 0 ? '600' : '400',
                                                        padding: '0.75rem',
                                                        borderRadius: '0.5rem'
                                                    }}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="action-btn delete"
                                                onClick={() => removePostingLine(index)}
                                                disabled={formData.postings.length <= 2}
                                                style={{ padding: '0.5rem', opacity: formData.postings.length <= 2 ? 0.3 : 1 }}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button type="button" className="btn outline" onClick={addPostingLine} style={{
                                    marginTop: '1rem',
                                    padding: '0.5rem 1rem',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    borderRadius: '0.5rem',
                                    border: '1px dashed var(--border)',
                                    background: 'transparent',
                                    width: 'fit-content'
                                }}>
                                    <Plus size={16} /> Add Another Line
                                </button>
                            </div>

                            <div style={{
                                padding: '1.5rem 2rem',
                                background: isBalanced ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                borderRadius: '1rem',
                                marginTop: '2.5rem',
                                border: `1px solid ${isBalanced ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', gap: '3rem' }}>
                                    <div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Debit</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent)' }}>{formatIndianRupee(totalDebit)}</div>
                                    </div>
                                    <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '3rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Credit</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ef4444' }}>{formatIndianRupee(totalCredit)}</div>
                                    </div>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    color: isBalanced ? 'var(--accent)' : '#ef4444',
                                    padding: '0.75rem 1.5rem',
                                    borderRadius: '0.75rem',
                                    background: 'rgba(255,255,255,0.03)'
                                }}>
                                    {isBalanced ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                                    <span style={{ fontWeight: '800', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {isBalanced ? 'Balanced' : 'Unbalanced'}
                                    </span>
                                </div>
                            </div>

                            <div className="form-actions" style={{ marginTop: '2.5rem' }}>
                                <button
                                    type="submit"
                                    className="btn"
                                    style={{
                                        width: '100%',
                                        padding: '1.25rem',
                                        fontSize: '1.125rem',
                                        fontWeight: '700',
                                        borderRadius: '0.75rem',
                                        boxShadow: isBalanced ? '0 10px 15px -3px rgba(99, 102, 241, 0.3)' : 'none',
                                        opacity: isBalanced ? 1 : 0.5,
                                        cursor: isBalanced ? 'pointer' : 'not-allowed'
                                    }}
                                    disabled={!isBalanced}
                                >
                                    {editJournalId ? 'Update Journal Entry' : 'Post Journal Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* FD Quick Action Modal - Kept same logic, just minor style updates if needed */}
            {fdModalType && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '600px', width: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2>
                                {fdModalType === 'create' && 'Create Fixed Deposit'}
                                {fdModalType === 'interest' && 'Accrue FD Interest'}
                                {fdModalType === 'tds' && 'Record Interest with TDS'}
                                {fdModalType === 'mature' && 'FD Maturity'}
                            </h2>
                            <button className="action-btn" onClick={resetFdForm}><X size={20} /></button>
                        </div>

                        {/* Summary Table */}
                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', fontSize: '0.85rem' }}>
                            <table style={{ width: '100%', background: 'transparent' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '0.25rem 0' }}>Account</th>
                                        <th style={{ textAlign: 'right', padding: '0.25rem 0' }}>Debit</th>
                                        <th style={{ textAlign: 'right', padding: '0.25rem 0' }}>Credit</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fdModalType === 'create' && (
                                        <>
                                            <tr><td>Fixed Deposit (Asset)</td><td style={{ textAlign: 'right', color: 'var(--accent)' }}>Principal</td><td></td></tr>
                                            <tr><td>Bank Account (Asset)</td><td></td><td style={{ textAlign: 'right', color: '#ef4444' }}>Principal</td></tr>
                                        </>
                                    )}
                                    {fdModalType === 'interest' && (
                                        <>
                                            <tr><td>Fixed Deposit (Asset)</td><td style={{ textAlign: 'right', color: 'var(--accent)' }}>Interest</td><td></td></tr>
                                            <tr><td>Interest Income (Revenue)</td><td></td><td style={{ textAlign: 'right', color: '#ef4444' }}>Interest</td></tr>
                                        </>
                                    )}
                                    {fdModalType === 'tds' && (
                                        <>
                                            <tr><td>Fixed Deposit (Asset)</td><td style={{ textAlign: 'right', color: 'var(--accent)' }}>Net Interest</td><td></td></tr>
                                            <tr><td>TDS Receivable (Asset)</td><td style={{ textAlign: 'right', color: 'var(--accent)' }}>TDS Amount</td><td></td></tr>
                                            <tr><td>Interest Income (Revenue)</td><td></td><td style={{ textAlign: 'right', color: '#ef4444' }}>Gross Interest</td></tr>
                                        </>
                                    )}
                                    {fdModalType === 'mature' && (
                                        <>
                                            <tr><td>Bank Account (Asset)</td><td style={{ textAlign: 'right', color: 'var(--accent)' }}>Total Amount</td><td></td></tr>
                                            <tr><td>Fixed Deposit (Asset)</td><td></td><td style={{ textAlign: 'right', color: '#ef4444' }}>Total Amount</td></tr>
                                        </>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <form onSubmit={handleFdSubmit}>
                            <div className="form-group">
                                <label>Transaction Date</label>
                                <input
                                    type="date"
                                    value={fdForm.transactionDate}
                                    onChange={e => setFdForm({ ...fdForm, transactionDate: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>FD / RD Account</label>
                                <select
                                    value={fdForm.fdAccountId}
                                    onChange={e => setFdForm({ ...fdForm, fdAccountId: e.target.value })}
                                    required
                                >
                                    <option value="">Select FD Account</option>
                                    {getFdAccounts().map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>

                            {(fdModalType === 'create' || fdModalType === 'mature') && (
                                <div className="form-group">
                                    <label>Bank Account</label>
                                    <select
                                        value={fdForm.bankAccountId}
                                        onChange={e => setFdForm({ ...fdForm, bankAccountId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Bank Account</option>
                                        {getBankAccounts().map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {(fdModalType === 'interest' || fdModalType === 'tds') && (
                                <div className="form-group">
                                    <label>Interest Income Account</label>
                                    <select
                                        value={fdForm.interestIncomeAccountId}
                                        onChange={e => setFdForm({ ...fdForm, interestIncomeAccountId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Interest Income Account</option>
                                        {getInterestIncomeAccounts().map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {fdModalType === 'tds' && (
                                <div className="form-group">
                                    <label>TDS Receivable Account</label>
                                    <select
                                        value={fdForm.tdsAccountId}
                                        onChange={e => setFdForm({ ...fdForm, tdsAccountId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select TDS Receivable Account</option>
                                        {getTdsAccounts().map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {fdModalType === 'tds' ? (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label>Gross Interest</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="Total interest before TDS"
                                            value={fdForm.grossInterest}
                                            onChange={e => setFdForm({ ...fdForm, grossInterest: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>TDS Amount</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            placeholder="Tax deducted"
                                            value={fdForm.tdsAmount}
                                            onChange={e => setFdForm({ ...fdForm, tdsAmount: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>Amount</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder={fdModalType === 'create' ? 'Principal Amount' : fdModalType === 'mature' ? 'Total Maturity Amount' : 'Interest Amount'}
                                        value={fdForm.amount}
                                        onChange={e => setFdForm({ ...fdForm, amount: e.target.value })}
                                        required
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Description (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="E.g. HDFC FD #12345"
                                    value={fdForm.description}
                                    onChange={e => setFdForm({ ...fdForm, description: e.target.value })}
                                />
                            </div>

                            <button type="submit" className="btn" style={{ width: '100%', marginTop: '1rem' }}>
                                Post Journal Entry
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default AccountingJournals;
