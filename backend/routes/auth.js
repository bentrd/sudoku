// routes/auth.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');

const { TextEncoder } = require('util');
const { cp } = require('fs');

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
        const passwordMatch = await bcrypt.compare(password, user ? user.password : '');
        if (!user || !passwordMatch) {
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
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: { username, email, password: hashedPassword }
        });
        return res.status(201).json({ message: 'User created successfully', userId: newUser.id });
    } catch (err) {
        console.error('Signup error:', err);
        return res.status(500).json({ message: 'Signup failed' });
    }
});

// Change password for the current user
router.post('/change-password', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    console.log('Access token:', token);
    const accessPayload = await verifyToken(token, { returnPayload: true });
    if (!accessPayload) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const refreshToken = accessPayload.data;
    const refreshPayload = await verifyToken(refreshToken, { returnPayload: true });
    console.log('Refresh token:', refreshToken);
    console.log('Refresh token payload:', refreshPayload);
    if (!refreshPayload) {  
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = refreshPayload.data;     

    // Update the user's password in the database
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }
        const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/update-profile', async (req, res) => {    
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const accessPayload = await verifyToken(token, { returnPayload: true });
    if (!accessPayload) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const refreshToken = accessPayload.data;
    const refreshPayload = await verifyToken(refreshToken, { returnPayload: true });
    if (!refreshPayload) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const userId = refreshPayload.data;

    try {
        const { username, email } = req.body;
        if (!username || !email) {
            return res.status(400).json({ message: 'Username and email are required' });
        }
        // Check if the username or email already exists for another user
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username, id: { not: userId } },
                    { email, id: { not: userId } }
                ]
            }
        });
        if (existingUser) {
            return res.status(409).json({ message: 'Username or email already in use' });
        }
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { username, email },
            select: { id: true, username: true, email: true }
        });
        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;