import React, { useState, useEffect } from 'react';
import { Folder, FileText, ChevronRight, ChevronDown, Plus, Edit2, Trash2, X } from 'lucide-react';
import api from '../services/api';

const ChartOfAccounts = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'Asset',
        subType: '',
        parentId: ''
    });

    useEffect(() => {
        fetchCoA();
    }, []);

    const fetchCoA = async () => {
        try {
            const res = await api.get('/accounting/coa');
            setAccounts(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching CoA:', err);
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingAccount) {
                await api.put(`/accounting/coa/${editingAccount.id}`, formData);
            } else {
                await api.post('/accounting/coa', formData);
            }
            setIsModalOpen(false);
            setEditingAccount(null);
            setFormData({ name: '', type: 'Asset', subType: '', parentId: '' });
            fetchCoA();
        } catch (err) {
            alert('Error saving account: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this account?')) return;
        try {
            await api.delete(`/accounting/coa/${id}`);
            fetchCoA();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    const openEditModal = (acc) => {
        setEditingAccount(acc);
        setFormData({
            name: acc.name,
            type: acc.type,
            subType: acc.subType || '',
            parentId: acc.parentId || ''
        });
        setIsModalOpen(true);
    };

    const renderAccountGroup = (type) => {
        const groupAccounts = accounts.filter(acc => acc.type === type);

        return (
            <div key={type} className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2d3748', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>{type}</h3>
                    <button className="btn outline" onClick={() => {
                        setFormData({ name: '', type, subType: '', parentId: '' });
                        setIsModalOpen(true);
                    }}>
                        <Plus size={14} /> Add {type}
                    </button>
                </div>
                <div className="table-container">
                    {groupAccounts.length > 0 ? (
                        <table style={{ background: 'transparent' }}>
                            <thead>
                                <tr>
                                    <th>Account Name</th>
                                    <th>Sub-Type</th>
                                    <th>Source</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupAccounts.map(acc => (
                                    <tr key={acc.id} style={{ borderBottom: '1px solid #1a202c' }}>
                                        <td style={{ fontWeight: AccIsRoot(acc) ? 'bold' : 'normal', paddingLeft: acc.parentId ? '1.5rem' : '0' }}>
                                            {AccIsRoot(acc) ? '' : '• '} {acc.name}
                                        </td>
                                        <td style={{ color: 'var(--text-muted)' }}>{acc.subType}</td>
                                        <td style={{ fontSize: '0.8rem' }}>
                                            {acc.linkedType ? `${acc.linkedType}` : 'Manual'}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button className="action-btn edit" onClick={() => openEditModal(acc)} title="Edit">
                                                    <Edit2 size={14} />
                                                </button>
                                                {!acc.linkedType && (
                                                    <button className="action-btn delete" onClick={() => handleDelete(acc.id)} title="Delete">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
                            No {type} accounts defined.
                        </p>
                    )}
                </div>
            </div>
        );
    };

    const AccIsRoot = (acc) => acc.subType === 'Root';

    if (loading) return <div className="loading">Loading Chart of Accounts...</div>;

    const types = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

    return (
        <section className="journal-section">
            <div className="coa-grid">
                {types.map(type => renderAccountGroup(type))}
            </div>


            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2>{editingAccount ? 'Edit Account' : 'New Ledger Account'}</h2>
                            <button className="action-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Account Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>Type</label>
                                    <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Sub-Type</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Current, Fixed, Capital"
                                        value={formData.subType}
                                        onChange={e => setFormData({ ...formData, subType: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Parent Account (Optional)</label>
                                <select value={formData.parentId} onChange={e => setFormData({ ...formData, parentId: e.target.value })}>
                                    <option value="">None (Top Level)</option>
                                    {accounts.filter(a => a.type === formData.type && a.id !== editingAccount?.id).map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                                <button type="submit" className="btn" style={{ width: '100%' }}>
                                    {editingAccount ? 'Update Account' : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default ChartOfAccounts;
