const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { User } = require('../models');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET || 'your_fallback_secret';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware to protect routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = user;
        next();
    });
};

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'User already exists.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password: hashedPassword });

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.status(201).json({ token, user: { id: user.id, email: user.email, isTwoFactorEnabled: false } });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user || !user.password) return res.status(401).json({ error: 'Invalid credentials.' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials.' });

        if (user.isTwoFactorEnabled) {
            return res.json({ requires2FA: true, userId: user.id });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, email: user.email, isTwoFactorEnabled: false } });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Google SSO
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { sub: googleId, email } = payload;

        let user = await User.findOne({ where: { [require('../models').sequelize.Sequelize.Op.or]: [{ googleId }, { email }] } });

        if (!user) {
            user = await User.create({ email, googleId });
        } else if (!user.googleId) {
            user.googleId = googleId;
            await user.save();
        }

        if (user.isTwoFactorEnabled) {
            return res.json({ requires2FA: true, userId: user.id });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, email: user.email, isTwoFactorEnabled: user.isTwoFactorEnabled } });
    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(400).json({ error: 'Google authentication failed.' });
    }
});

// 2FA Setup
router.get('/2fa/setup', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (user.isTwoFactorEnabled) return res.status(400).json({ error: '2FA already enabled.' });

        const secret = speakeasy.generateSecret({ name: `PMS (${user.email})` });
        user.twoFactorSecret = secret.base32;
        await user.save();

        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
        res.json({ qrCodeUrl, secret: secret.base32 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2FA Verify & Enable
router.post('/2fa/verify', authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findByPk(req.user.id);

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token
        });

        if (verified) {
            user.isTwoFactorEnabled = true;
            await user.save();
            res.json({ success: true });
        } else {
            res.status(400).json({ error: 'Invalid verification code.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login 2FA Verification
router.post('/2fa/login-verify', async (req, res) => {
    try {
        const { userId, token } = req.body;
        const user = await User.findByPk(userId);

        if (!user || !user.isTwoFactorEnabled) return res.status(400).json({ error: '2FA not enabled for this user.' });

        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token
        });

        if (verified) {
            const jwtToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1d' });
            res.json({ token: jwtToken, user: { id: user.id, email: user.email, isTwoFactorEnabled: true } });
        } else {
            res.status(400).json({ error: 'Invalid verification code.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = { router, authenticateToken };
