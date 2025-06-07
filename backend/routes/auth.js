// routes/auth.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const { generateAccessToken, generateRefreshToken, verifyToken, requireAuth } = require('../utils/AuthUtils');

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
            select: { id: true, username: true, email: true, elo: true, country: true }
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
    const { username, email, password, country } = req.body;
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
            data: { username, email, password: hashedPassword, country },
        });
        return res.status(201).json({ message: 'User created successfully', userId: newUser.id });
    } catch (err) {
        console.error('Signup error:', err);
        return res.status(500).json({ message: 'Signup failed' });
    }
});

// Change password for the current user
router.post('/change-password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current password and new password are required' });
    }
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid current password' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.userId },
            data: { password: hashedPassword }
        });
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Error changing password:', err);
        res.status(500).json({ message: 'Internal server error' });
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

router.post('/update-profile', requireAuth, async (req, res) => {
    const { username, email, country } = req.body;
    if (!username || !email || !country) {
        return res.status(400).json({ message: 'Username, email, and country are required' });
    }
    try {
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Check if the username or email already exists for another user
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username, id: { not: user.id } },
                    { email, id: { not: user.id } }
                ]
            }
        });
        if (existingUser) {
            return res.status(409).json({ message: 'Username or email already in use' });
        }
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { username, email, country },
            select: { id: true, username: true, email: true, country: true }
        });
        res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/:userId/nametag', requireAuth, async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, country: true }
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        console.error('Error fetching user for nametag:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;