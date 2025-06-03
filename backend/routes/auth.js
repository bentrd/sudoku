// routes/auth.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const cookieParser = require('cookie-parser');

const { TextEncoder } = require('util');

const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'test_secret_key';
const jwtSecret = new TextEncoder().encode(JWT_SECRET_KEY);

/**
 * Verifies a JWT token using jose.jwtVerify
 */
async function verifyToken(token, { returnPayload = false } = {}) {
    try {
        const { jwtVerify } = await import('jose');
        const { payload } = await jwtVerify(token, jwtSecret);
        return returnPayload ? payload : true;
    } catch (err) {
        return false;
    }
}

/**
 * Generates a refresh token containing the provided data.
 * Expires in 30 days.
 */
async function generateRefreshToken(data) {
    const { SignJWT } = await import('jose');
    return await new SignJWT({ data })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('30d')
        .sign(jwtSecret);
}

/**
 * Generates an access token containing the provided refresh token string.
 * Expires in 15 minutes.
 */
async function generateAccessToken(refreshToken) {
    const { SignJWT } = await import('jose');
    return await new SignJWT({ data: refreshToken })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('15m')
        .sign(jwtSecret);
}

const prisma = new PrismaClient();
router.use(cookieParser());

// Get current user / verify access token
router.get('/me', async (req, res) => {
    console.log('Accessing /me endpoint');
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const accessPayload = await verifyToken(token, { returnPayload: true });
    if (!accessPayload) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    // The access token payload.data holds the refreshToken
    const refreshToken = accessPayload.data;
    const refreshPayload = await verifyToken(refreshToken, { returnPayload: true });
    if (!refreshPayload) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    // Extract user ID from refresh token payload
    const userId = refreshPayload.data;
    try {
        const user = await prisma.user.findUnique({
            where: { id: Number(userId) },
            select: { id: true, username: true, email: true }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ accessToken: token, user });
    } catch (err) {
        console.error('Error fetching user in /me:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Refresh the access token using the HTTP-only cookie
router.get('/refreshToken', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    const refreshPayload = refreshToken
        ? await verifyToken(refreshToken, { returnPayload: true })
        : null;
    if (process.env.USE_AUTH && !refreshPayload) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const newAccessToken = await generateAccessToken(refreshToken);
    res.json({ accessToken: newAccessToken });
});

// Sign in a user and issue tokens
router.post('/login', async (req, res) => {
    console.log('Login attempt:', req.body);
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    try {
        let user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            user = await prisma.user.findUnique({ where: { email: username } });
        }
        if (!user || user.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const refreshToken = await generateRefreshToken(user.id);
        console.log('Generated refresh token:', refreshToken);
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
        const accessToken = await generateAccessToken(refreshToken);
        console.log('Generated access token:', accessToken);
        return res.json({ accessToken });
    } catch (error) {
        console.error('Signin error:', error);
        return res.status(500).json({ message: 'Login failed' });
    }
});

// Sign up a new user
router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
    }
    try {
        const existingByUsername = await prisma.user.findUnique({ where: { username } });
        if (existingByUsername) {
            return res.status(409).json({ message: 'Username already taken' });
        }
        const existingByEmail = await prisma.user.findUnique({ where: { email } });
        if (existingByEmail) {
            return res.status(409).json({ message: 'Email already registered' });
        }
        const newUser = await prisma.user.create({
            data: { username, email, password }
        });
        return res.status(201).json({ message: 'User created successfully', userId: newUser.id });
    } catch (err) {
        console.error('Signup error:', err);
        return res.status(500).json({ message: 'Signup failed' });
    }
});

module.exports = router;