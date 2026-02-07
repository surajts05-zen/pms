import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, CheckCircle, Copy, AlertCircle } from 'lucide-react';
import api from '../services/api';

const TwoFactorSetup = () => {
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [token, setToken] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, setup, verifying, success, error
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.isTwoFactorEnabled) {
            setStatus('enabled');
        }
    }, []);

    const startSetup = async () => {
        setStatus('loading');
        try {
            const res = await api.get('/auth/2fa/setup');
            setQrCodeUrl(res.data.qrCodeUrl);
            setSecret(res.data.secret);
            setStatus('setup');
        } catch (err) {
            setErrorMessage(err.response?.data?.error || 'Failed to initialize 2FA setup');
            setStatus('error');
        }
    };

    const verifyAndEnable = async (e) => {
        e.preventDefault();
        setStatus('verifying');
        try {
            await api.post('/auth/2fa/verify', { token });
            setStatus('success');
            // Update local user state if needed
            const user = JSON.parse(localStorage.getItem('user'));
            user.isTwoFactorEnabled = true;
            localStorage.setItem('user', JSON.stringify(user));
        } catch (err) {
            setErrorMessage(err.response?.data?.error || 'Verification failed');
            setStatus('setup');
        }
    };

    const disable2FA = async () => {
        if (!window.confirm('Are you sure you want to disable 2-Step Verification? Your account will be less secure.')) {
            return;
        }

        setStatus('loading');
        try {
            await api.post('/auth/2fa/disable');

            // Update local user state
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.isTwoFactorEnabled = false;
            localStorage.setItem('user', JSON.stringify(user));

            setStatus('idle');
        } catch (err) {
            setErrorMessage(err.response?.data?.error || 'Failed to disable 2FA');
            setStatus('enabled');
        }
    };

    if (status === 'success' || status === 'enabled') {
        return (
            <div style={containerStyle}>
                <CheckCircle size={48} color="var(--accent)" style={{ marginBottom: '1rem' }} />
                <h3>{status === 'success' ? '2FA Successfully Enabled' : '2FA is Active'}</h3>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.5rem' }}>
                    {status === 'success'
                        ? 'Your account is now protected with 2-Step Verification.'
                        : 'Your account is currently protected with 2-Step Verification.'}
                </p>

                {status === 'enabled' && (
                    <button
                        onClick={disable2FA}
                        className="btn-secondary"
                        style={{
                            fontSize: '0.9rem',
                            padding: '0.5rem 1rem',
                            color: '#ef4444',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            background: 'rgba(239, 68, 68, 0.05)'
                        }}
                    >
                        Disable 2-Step Verification
                    </button>
                )}
            </div>
        );
    }

    if (status === 'idle') {
        return (
            <div style={containerStyle}>
                <Shield size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                <h3>Enable 2-Step Verification</h3>
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1.5rem' }}>
                    Add an extra layer of security to your account using Google Authenticator.
                </p>
                <button onClick={startSetup} className="btn">Get Started</button>
            </div>
        );
    }

    return (
        <div style={{ ...containerStyle, alignItems: 'flex-start' }}>
            <h3 style={{ marginBottom: '1rem' }}>Setup 2-Step Verification</h3>

            <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                1. Install Google Authenticator on your mobile device.<br />
                2. Scan the QR code below or enter the manual key.
            </p>

            <div style={{ background: '#fff', padding: '1rem', borderRadius: '0.5rem', margin: '0 auto 1.5rem' }}>
                <img src={qrCodeUrl} alt="QR Code" style={{ display: 'block', width: '200px', height: '200px' }} />
            </div>

            <div style={{ marginBottom: '1.5rem', width: '100%' }}>
                <label style={labelStyle}>Manual Key</label>
                <div style={secretWrapperStyle}>
                    <code>{secret}</code>
                    <button
                        onClick={() => navigator.clipboard.writeText(secret)}
                        style={copyButtonStyle}
                        title="Copy to clipboard"
                    >
                        <Copy size={16} />
                    </button>
                </div>
            </div>

            <form onSubmit={verifyAndEnable} style={{ width: '100%' }}>
                <div className="form-group">
                    <label style={labelStyle}>Enter 6-digit verification code</label>
                    <input
                        type="text"
                        placeholder="000000"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        required
                        style={inputStyle}
                    />
                </div>
                {errorMessage && (
                    <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={14} /> {errorMessage}
                    </div>
                )}
                <button type="submit" className="btn" style={{ width: '100%' }} disabled={status === 'verifying'}>
                    {status === 'verifying' ? 'Verifying...' : 'Verify and Enable'}
                </button>
            </form>
        </div>
    );
};

const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '1rem',
    border: '1px solid #30363d',
    maxWidth: '450px',
    margin: '2rem auto'
};

const labelStyle = {
    display: 'block',
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginBottom: '0.5rem'
};

const secretWrapperStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#0d1117',
    padding: '0.75rem 1rem',
    borderRadius: '0.5rem',
    border: '1px solid #30363d',
    fontSize: '0.9rem'
};

const copyButtonStyle = {
    background: 'transparent',
    border: 'none',
    color: 'var(--accent)',
    cursor: 'pointer',
    padding: '4px'
};

const inputStyle = {
    width: '100%',
    padding: '0.75rem',
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '0.5rem',
    color: '#fff',
    fontSize: '1rem',
    textAlign: 'center',
    letterSpacing: '0.2em'
};

export default TwoFactorSetup;
