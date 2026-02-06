import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { Lock, Mail, Github, Chrome, ShieldCheck } from 'lucide-react';
import api from '../services/api';

const Login = ({ onLoginSuccess }) => {
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // 2FA state
    const [requires2FA, setRequires2FA] = useState(false);
    const [twoFactorToken, setTwoFactorToken] = useState('');
    const [userIdFor2FA, setUserIdFor2FA] = useState(null);

    const handleLocalAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (isSignup && password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            const endpoint = isSignup ? '/auth/signup' : '/auth/login';
            const res = await api.post(endpoint, { email, password });

            if (res.data.requires2FA) {
                setRequires2FA(true);
                setUserIdFor2FA(res.data.userId);
            } else {
                onLoginSuccess(res.data.token, res.data.user);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handle2FAVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/2fa/login-verify', {
                userId: userIdFor2FA,
                token: twoFactorToken
            });
            onLoginSuccess(res.data.token, res.data.user);
        } catch (err) {
            setError(err.response?.data?.error || '2FA verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/auth/google', {
                credential: credentialResponse.credential
            });
            if (res.data.requires2FA) {
                setRequires2FA(true);
                setUserIdFor2FA(res.data.userId);
            } else {
                onLoginSuccess(res.data.token, res.data.user);
            }
        } catch (err) {
            setError('Google authentication failed');
        } finally {
            setLoading(false);
        }
    };

    if (requires2FA) {
        return (
            <div className="login-container" style={loginContainerStyle}>
                <div className="login-card" style={loginCardStyle}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={iconWrapperStyle}>
                            <ShieldCheck size={32} color="var(--accent)" />
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>2-Step Verification</h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Enter the code from your Authenticator app</p>
                    </div>

                    {error && <div style={errorStyle}>{error}</div>}

                    <form onSubmit={handle2FAVerify}>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={labelStyle}>Verification Code</label>
                            <div style={inputWrapperStyle}>
                                <Lock size={18} style={inputIconStyle} />
                                <input
                                    type="text"
                                    placeholder="000000"
                                    value={twoFactorToken}
                                    onChange={(e) => setTwoFactorToken(e.target.value)}
                                    style={inputStyle}
                                    required
                                />
                            </div>
                        </div>
                        <button type="submit" className="btn" style={buttonStyle} disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>
                        <button
                            type="button"
                            onClick={() => { setRequires2FA(false); setUserIdFor2FA(null); }}
                            style={{ ...buttonStyle, background: 'transparent', border: '1px solid #2d3748', marginTop: '0.5rem' }}
                        >
                            Back to Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container" style={loginContainerStyle}>
            <div className="login-card" style={loginCardStyle}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={iconWrapperStyle}>
                        <span style={{ fontSize: '2rem' }}>💠</span>
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#fff' }}>Welcome to Portflo.ai</h2>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        {isSignup ? 'Create an account to get started' : 'Sign in to manage your portfolio'}
                    </p>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Google Sign-In was unsuccessful')}
                        theme="filled_black"
                        shape="pill"
                        width="100%"
                    />
                </div>

                <div style={dividerStyle}>
                    <span style={dividerTextStyle}>or continue with email</span>
                </div>

                {error && <div style={errorStyle}>{error}</div>}

                <form onSubmit={handleLocalAuth}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label style={labelStyle}>Email Address</label>
                        <div style={inputWrapperStyle}>
                            <Mail size={18} style={inputIconStyle} />
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={inputStyle}
                                required
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginBottom: isSignup ? '1rem' : '1.5rem' }}>
                        <label style={labelStyle}>Password</label>
                        <div style={inputWrapperStyle}>
                            <Lock size={18} style={inputIconStyle} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={inputStyle}
                                required
                            />
                        </div>
                    </div>
                    {isSignup && (
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={labelStyle}>Confirm Password</label>
                            <div style={inputWrapperStyle}>
                                <Lock size={18} style={inputIconStyle} />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={inputStyle}
                                    required
                                />
                            </div>
                        </div>
                    )}
                    <button type="submit" className="btn" style={buttonStyle} disabled={loading}>
                        {loading ? 'Authenticating...' : (isSignup ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <p style={signupTextStyle}>
                    {isSignup ? 'Already have an account?' : "Don't have an account?"}
                    <button
                        onClick={() => setIsSignup(!isSignup)}
                        style={signupButtonStyle}
                    >
                        {isSignup ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
};

// Styles (Matching the existing dashboard aesthetic)
const loginContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    width: '100%',
    background: '#0d1117',
    padding: '1rem'
};

const loginCardStyle = {
    width: '100%',
    maxWidth: '400px',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '1rem',
    padding: '2.5rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
};

const iconWrapperStyle = {
    width: '64px',
    height: '64px',
    background: 'rgba(99, 102, 241, 0.1)',
    borderRadius: '1rem',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: '0 auto 1.5rem'
};

const labelStyle = {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#8b949e',
    marginBottom: '0.5rem'
};

const inputWrapperStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
};

const inputIconStyle = {
    position: 'absolute',
    left: '1rem',
    color: '#484f58'
};

const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem 0.75rem 3rem',
    background: '#0d1117',
    border: '1px solid #30363d',
    borderRadius: '0.5rem',
    color: '#c9d1d9',
    fontSize: '1rem',
    transition: 'border-color 0.2s',
    outline: 'none'
};

const buttonStyle = {
    width: '100%',
    padding: '0.75rem',
    background: 'var(--primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s'
};

const dividerStyle = {
    display: 'flex',
    alignItems: 'center',
    margin: '1.5rem 0',
    color: '#30363d'
};

const dividerTextStyle = {
    padding: '0 1rem',
    fontSize: '0.75rem',
    color: '#8b949e',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const errorStyle = {
    background: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    border: '1px solid rgba(239, 68, 68, 0.2)'
};

const signupTextStyle = {
    textAlign: 'center',
    marginTop: '1.5rem',
    fontSize: '0.875rem',
    color: '#8b949e'
};

const signupButtonStyle = {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    fontWeight: '600',
    marginLeft: '0.5rem',
    cursor: 'pointer'
};

export default Login;
