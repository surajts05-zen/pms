import React, { useState, useEffect } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import axios from 'axios';
import TwoFactorSetup from '../components/TwoFactorSetup';
import api from '../services/api';

function Settings() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await api.get('/accounts');
            setAccounts(res.data);
        } catch (err) {
            console.error('Error fetching accounts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBalanceChange = (id, value) => {
        setAccounts(prev => prev.map(acc =>
            acc.id === id ? { ...acc, openingBalance: value } : acc
        ));
    };

    const handleDateChange = (id, value) => {
        setAccounts(prev => prev.map(acc =>
            acc.id === id ? { ...acc, openingBalanceDate: value } : acc
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const data = accounts.map(acc => ({
                id: acc.id,
                openingBalance: parseFloat(acc.openingBalance || 0),
                openingBalanceDate: acc.openingBalanceDate
            }));
            await api.put('/accounts/bulk-opening-balances', { accounts: data });
            alert('Opening balances updated successfully!');
        } catch (err) {
            alert('Error updating opening balances: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="journal-section">
            <div className="header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Application Settings</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Manage account opening balances and configurations</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-secondary" onClick={fetchAccounts} disabled={loading}>
                        <RefreshCw size={18} style={{ marginRight: '8px' }} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button className="btn" onClick={handleSave} disabled={saving || loading}>
                        <Save size={18} style={{ marginRight: '8px' }} /> {saving ? 'Saving...' : 'Save All'}
                    </button>
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '1.5rem' }}>Account Opening Balances</h3>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Account Name</th>
                                <th>Type</th>
                                <th>Opening Balance</th>
                                <th>Balance Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.map(acc => (
                                <tr key={acc.id}>
                                    <td style={{ fontWeight: '600' }}>{acc.name}</td>
                                    <td style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{acc.type}</td>
                                    <td>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={acc.openingBalance}
                                            onChange={e => handleBalanceChange(acc.id, e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                background: 'var(--bg-color)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '0.375rem',
                                                color: 'var(--text-main)'
                                            }}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="date"
                                            value={acc.openingBalanceDate || ''}
                                            onChange={e => handleDateChange(acc.id, e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                background: 'var(--bg-color)',
                                                border: '1px solid var(--border)',
                                                borderRadius: '0.375rem',
                                                color: 'var(--text-main)'
                                            }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="card" style={{ marginTop: '2rem' }}>
                <TwoFactorSetup />
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}} />
        </section>
    );
}

export default Settings;
