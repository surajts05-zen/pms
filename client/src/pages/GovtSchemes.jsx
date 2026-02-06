import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, History, TrendingUp, Info, Save } from 'lucide-react';
import { formatIndianRupee, formatIndianRupeeInt } from '../utils/formatCurrency';
import api from '../services/api';

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

    useEffect(() => {
        fetchAccounts();
        fetchInterestRates();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/accounts');
            // Filter PF, PPF, SSY
            setAccounts(res.data.filter(a => ['pf', 'ppf', 'ssy'].includes(a.type)));
        } catch (err) {
            console.error('Error fetching accounts:', err);
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

            <div className="chart-section" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
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

            {isRateModalOpen && (
                <div className="modal-overlay">
                    <div className="modal" style={{ width: '400px' }}>
                        <h2>{editingRate ? 'Edit Interest Rate' : 'Add Interest Rate'}</h2>
                        <form onSubmit={handleRateSubmit} style={{ marginTop: '1.5rem' }}>
                            <div className="form-group">
                                <label>Instrument Type</label>
                                <select value={rateFormData.instrumentType} onChange={e => setRateFormData({ ...rateFormData, instrumentType: e.target.value })}>
                                    <option value="pf">PF</option>
                                    <option value="ppf">PPF</option>
                                    <option value="ssy">SSY</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Interest Rate (%)</label>
                                <input type="number" step="0.01" value={rateFormData.rate} onChange={e => setRateFormData({ ...rateFormData, rate: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Effective From</label>
                                <input type="date" value={rateFormData.effectiveFrom} onChange={e => setRateFormData({ ...rateFormData, effectiveFrom: e.target.value })} required />
                            </div>
                            <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setIsRateModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn" style={{ flex: 1 }} disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Rate'}
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
