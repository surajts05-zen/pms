import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { formatIndianRupee, formatIndianRupeeInt } from '../utils/formatCurrency';

const api = axios.create({
    baseURL: 'http://localhost:5000/api'
});

const FixedDeposits = () => {
    const [fds, setFds] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingFd, setEditingFd] = useState(null);
    const [redeemingFd, setRedeemingFd] = useState(null);

    const [formData, setFormData] = useState({
        bankName: '',
        accountNumber: '',
        principalAmount: '',
        interestRate: '',
        startDate: '',
        maturityDate: '',
        maturityAmount: '',
        autoRenew: false,
        compoundingFrequency: 'Quarterly',
        remarks: ''
    });

    const [redeemData, setRedeemData] = useState({
        redemptionDate: new Date().toISOString().split('T')[0],
        finalAmount: '',
        accountId: ''
    });

    useEffect(() => {
        fetchFds();
        fetchAccounts();
    }, []);

    // Auto-calculate maturity amount
    useEffect(() => {
        if (!editingFd && formData.principalAmount && formData.interestRate && formData.startDate && formData.maturityDate) {
            const p = parseFloat(formData.principalAmount);
            const r = parseFloat(formData.interestRate);
            const startStr = formData.startDate; // Keep as string for cleaner parsing if needed
            const endStr = formData.maturityDate;

            // Simple check
            if (!isNaN(p) && !isNaN(r) && startStr && endStr) {
                const start = new Date(startStr);
                const end = new Date(endStr);

                if (end > start) {
                    let monthsToAdd = 3; // Default Quarterly
                    switch (formData.compoundingFrequency) {
                        case 'Monthly': monthsToAdd = 1; break;
                        case 'Quarterly': monthsToAdd = 3; break;
                        case 'Half-Yearly': monthsToAdd = 6; break;
                        case 'Yearly': monthsToAdd = 12; break;
                    }

                    let currentDate = new Date(start);
                    let currentAmount = p;

                    // Iterative compounding with rounding (Bank Style)
                    while (true) {
                        let nextDate = new Date(currentDate);
                        nextDate.setMonth(nextDate.getMonth() + monthsToAdd);

                        if (nextDate > end) break;

                        // Interest for this period
                        let periodicRate = r / (12 / monthsToAdd);
                        let interest = currentAmount * (periodicRate / 100);
                        let roundedInterest = Math.round(interest);

                        currentAmount += roundedInterest;
                        currentDate = nextDate;
                    }

                    // Broken period calculation (Simple Interest)
                    const diffTime = Math.abs(end - currentDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days remaining

                    if (diffDays > 0) {
                        // Formula: Amount * (Rate/100) * (Days/365)
                        let brokenInterest = currentAmount * (r / 100) * (diffDays / 365);
                        let roundedBrokenInterest = Math.round(brokenInterest);
                        currentAmount += roundedBrokenInterest;
                    }

                    setFormData(prev => ({
                        ...prev,
                        maturityAmount: currentAmount.toFixed(2)
                    }));
                }
            }
        }
    }, [formData.principalAmount, formData.interestRate, formData.startDate, formData.maturityDate, formData.compoundingFrequency]);

    const fetchFds = async () => {
        try {
            const res = await api.get('/fds');
            setFds(res.data);
        } catch (err) {
            console.error('Error fetching FDs:', err);
        }
    };

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/accounts');
            setAccounts(res.data);
        } catch (err) {
            console.error('Error fetching accounts:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingFd) {
                await api.put(`/fds/${editingFd.id}`, formData);
                alert('Fixed Deposit updated successfully!');
            } else {
                await api.post('/fds', formData);
                alert('Fixed Deposit added successfully!');
            }
            setIsModalOpen(false);
            setEditingFd(null);
            resetForm();
            fetchFds();
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRedeemSubmit = async (e) => {
        e.preventDefault();
        if (!redeemingFd) return;
        setLoading(true);
        try {
            await api.post(`/fds/${redeemingFd.id}/redeem`, redeemData);
            alert('Fixed Deposit redeemed successfully!');
            setIsRedeemModalOpen(false);
            setRedeemingFd(null);
            fetchFds();
        } catch (err) {
            alert('Error redeeming FD: ' + (err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this FD?')) return;
        try {
            await api.delete(`/fds/${id}`);
            fetchFds();
        } catch (err) {
            alert('Delete failed: ' + err.message);
        }
    };

    const handleEdit = (fd) => {
        setEditingFd(fd);
        setFormData({
            bankName: fd.bankName,
            accountNumber: fd.accountNumber || '',
            principalAmount: fd.principalAmount,
            interestRate: fd.interestRate,
            startDate: fd.startDate,
            maturityDate: fd.maturityDate,
            maturityAmount: fd.maturityAmount,
            maturityAmount: fd.maturityAmount,
            autoRenew: fd.autoRenew,
            compoundingFrequency: fd.compoundingFrequency || 'Quarterly',
            remarks: fd.remarks || ''
        });
        setIsModalOpen(true);
    };

    const openRedeemModal = (fd) => {
        setRedeemingFd(fd);
        setRedeemData({
            redemptionDate: new Date().toISOString().split('T')[0],
            finalAmount: fd.maturityAmount, // Default to maturity amount
            accountId: ''
        });
        setIsRedeemModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            bankName: '',
            accountNumber: '',
            principalAmount: '',
            interestRate: '',
            startDate: '',
            maturityDate: '',
            maturityAmount: '',
            autoRenew: false,
            compoundingFrequency: 'Quarterly',
            remarks: ''
        });
    };

    // Filter active FDs for investment total
    const totalInvestment = fds
        .filter(fd => fd.status !== 'REDEEMED')
        .reduce((sum, fd) => sum + Number(fd.principalAmount), 0);

    const totalMaturity = fds
        .filter(fd => fd.status !== 'REDEEMED')
        .reduce((sum, fd) => sum + Number(fd.maturityAmount), 0);

    return (
        <section className="journal-section">
            <div className="header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Fixed Deposits</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Manage your fixed income investments</p>
                </div>
                <button className="btn" onClick={() => { setEditingFd(null); resetForm(); setIsModalOpen(true); }}>
                    <Plus size={16} style={{ marginRight: '6px' }} /> Add FD
                </button>
            </div>

            <div className="stats-grid" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="card">
                    <h3>Total Active Investment</h3>
                    <div className="value">{formatIndianRupee(totalInvestment)}</div>
                </div>
                <div className="card">
                    <h3>Total Future Value</h3>
                    <div className="value">{formatIndianRupee(totalMaturity)}</div>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Bank Name</th>
                            <th>Account No</th>
                            <th>Start Date</th>
                            <th>Maturity Date</th>
                            <th>Principal</th>
                            <th>Rate (%)</th>
                            <th>Maturity Value</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {fds.map(fd => (
                            <tr key={fd.id} style={{ opacity: fd.status === 'REDEEMED' ? 0.6 : 1 }}>
                                <td>
                                    <span className={`type-tag ${fd.status === 'REDEEMED' ? 'type-sell' : 'type-buy'}`}>
                                        {fd.status || 'ACTIVE'}
                                    </span>
                                </td>
                                <td style={{ fontWeight: '600' }}>{fd.bankName}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{fd.accountNumber || '-'}</td>
                                <td>{fd.startDate}</td>
                                <td>{fd.maturityDate}</td>
                                <td>{formatIndianRupee(Number(fd.principalAmount))}</td>
                                <td>{fd.interestRate}%</td>
                                <td style={{ fontWeight: '500', color: 'var(--accent)' }}>{formatIndianRupee(Number(fd.maturityAmount))}</td>
                                <td style={{ display: 'flex', gap: '0.5rem' }}>
                                    {fd.status !== 'REDEEMED' && (
                                        <button className="action-btn" title="Redeem FD" onClick={() => openRedeemModal(fd)} style={{ color: 'var(--accent)' }}>
                                            <CheckCircle size={16} />
                                        </button>
                                    )}
                                    <button className="action-btn edit" onClick={() => handleEdit(fd)}><Edit2 size={16} /></button>
                                    <button className="action-btn delete" onClick={() => handleDelete(fd.id)}><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal" style={{ width: '600px' }}>
                        <h2>{editingFd ? 'Edit Fixed Deposit' : 'Add Fixed Deposit'}</h2>
                        <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Bank Name</label>
                                <input type="text" value={formData.bankName} onChange={e => setFormData({ ...formData, bankName: e.target.value })} required />
                            </div>

                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Account Number</label>
                                <input type="text" value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} />
                            </div>

                            <div className="form-group">
                                <label>Interest Rate (%)</label>
                                <input type="number" step="0.01" value={formData.interestRate} onChange={e => setFormData({ ...formData, interestRate: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Compounding Frequency</label>
                                <select value={formData.compoundingFrequency} onChange={e => setFormData({ ...formData, compoundingFrequency: e.target.value })}>
                                    <option value="Monthly">Monthly</option>
                                    <option value="Quarterly">Quarterly</option>
                                    <option value="Half-Yearly">Half-Yearly</option>
                                    <option value="Yearly">Yearly</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Start Date</label>
                                <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Maturity Date</label>
                                <input type="date" value={formData.maturityDate} onChange={e => setFormData({ ...formData, maturityDate: e.target.value })} required />
                            </div>

                            <div className="form-group">
                                <label>Principal Amount</label>
                                <input type="number" step="0.01" value={formData.principalAmount} onChange={e => setFormData({ ...formData, principalAmount: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Maturity Amount</label>
                                <input type="number" step="0.01" value={formData.maturityAmount} onChange={e => setFormData({ ...formData, maturityAmount: e.target.value })} required />
                            </div>

                            <div className="form-group" style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '0.5rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ marginBottom: '0.25rem' }}>Calculated Interest</label>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                                        {formatIndianRupee((Number(formData.maturityAmount) || 0) - (Number(formData.principalAmount) || 0))}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" checked={formData.autoRenew} onChange={e => setFormData({ ...formData, autoRenew: e.target.checked })} style={{ width: 'auto' }} />
                                    <label style={{ marginBottom: 0, cursor: 'pointer' }}>Auto Renew</label>
                                </div>
                            </div>

                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Remarks</label>
                                <input type="text" value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} />
                            </div>
                            <div className="form-actions" style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '0' }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn" style={{ flex: 1 }} disabled={loading}>
                                    {loading ? 'Saving...' : 'Save FD'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Redeem Modal */}
            {isRedeemModalOpen && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h2>Redeem Fixed Deposit</h2>
                        <div style={{ margin: '1rem 0', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Redeeming: <strong>{redeemingFd?.bankName}</strong></div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Principal: <strong>{formatIndianRupee(Number(redeemingFd?.principalAmount))}</strong></div>
                        </div>
                        <form onSubmit={handleRedeemSubmit} style={{ marginTop: '1.5rem' }}>
                            <div className="form-group">
                                <label>Redemption Date</label>
                                <input type="date" value={redeemData.redemptionDate} onChange={e => setRedeemData({ ...redeemData, redemptionDate: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Final Redemption Amount</label>
                                <input type="number" step="0.01" value={redeemData.finalAmount} onChange={e => setRedeemData({ ...redeemData, finalAmount: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Deposit To Account (Optional)</label>
                                <select value={redeemData.accountId} onChange={e => setRedeemData({ ...redeemData, accountId: e.target.value })}>
                                    <option value="">Do not creates transactions</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} - {acc.institution}</option>)}
                                </select>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Selection will credit principal and interest as transactions.
                                </p>
                            </div>
                            <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsRedeemModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn" style={{ flex: 1, backgroundColor: 'var(--accent)' }} disabled={loading}>
                                    {loading ? 'Redeeming...' : 'Confirm Redemption'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default FixedDeposits;
