// routes/sudoku.js
const express = require('express');
const router = express.Router();
const SudokuSolver = require('../utils/SudokuSolver');
const { PrismaClient } = require('@prisma/client');
const { Worker } = require('worker_threads');
const cookieParser = require('cookie-parser');
// Token helpers (adjust path if necessary)
const {
    generateAccessToken,
    generateRefreshToken,
    verifyToken,
} = require('../utils/helpers');

const prisma = new PrismaClient();
// parse cookies for refreshToken lookup
router.use(cookieParser());

router.get('/generate', (req, res) => {
    const { difficulty = 'Easy', puzzle = '' } = req.query;
    // offload generation & solve to worker
    const worker = new Worker(
        require('path').resolve(__dirname, '../workers/generate.js'),
        { workerData: { difficulty, puzzle } }
    );

    worker.on('message', data => {
        if (data.type === 'result') {
            res.json({
                id: data.msg.id,
                puzzle: data.msg.puzzle,
                solution: data.msg.solution,
                rating: data.msg.rating,
                category: data.msg.category,
                techniques: data.msg.techniques
            });
        }
    });
    worker.once('error', err => {
        console.error('Worker error:', err);
        res.status(500).json({ error: 'Puzzle generation failed' });
    });
});

router.post('/check', async (req, res) => {
    const { id, solution } = req.query;

    if (!id || !solution) {
        return res.status(400).json({ error: 'Missing id or solution' });
    }

    try {
        const game = await prisma.game.findUnique({
            where: { id: Number(id) }
        });

        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }

        const isCorrect = game.solution === solution;
        console.log(game.solution, solution, isCorrect);
        res.json({ isCorrect });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to check solution' });
    }
});

router.post('/solve', (req, res) => {
    const { puzzle } = req.body;
    if (!Array.isArray(puzzle) || puzzle.length !== 81) {
        return res.status(400).json({ error: 'Invalid puzzle format' });
    }

    const solver = new SudokuSolver(puzzle);
    const { solution, techniques, difficulty } = solver.solve();

    res.json({
        solution: solution.map(n => (n === 0 ? [] : n)),
        techniques,
        difficulty,
    });
});

router.get('/games', async (req, res) => {
    try {
        const games = await prisma.game.findMany({
            orderBy: { difficulty: 'desc' }
        });
        res.json(games);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch games' });
    }
});

// Delete a stored puzzle by ID
router.delete('/games/:id', async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid game ID' });
    }
    try {
        const deleted = await prisma.game.delete({ where: { id } });
        res.json({ success: true, id: deleted.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete game' });
    }
});

router.post('/place', async (req, res) => {
    // receive a puzzle, a cell index and a value, and return the puzzle with the value placed and the candidates updated
    const { puzzle, cellIndex, value } = req.body;
    //console.log('Received puzzle:', req.body);
    if (!Array.isArray(puzzle) || puzzle.length !== 81 || typeof cellIndex !== 'number' || typeof value !== 'string') {
        return res.status(400).json({ error: 'Invalid input format' });
    }

    const solver = new SudokuSolver(puzzle);
    solver.setCell(cellIndex, (value === '' ? [] : Number(value)));
    const updatedPuzzle = solver.puzzle.slice();

    res.json({
        puzzle: updatedPuzzle,
    });
});

// --- Authentication routes ---

// Get current user / verify access token
router.get('/me', async (req, res) => {
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
            select: { id: true, username: true, email: true } // adjust fields as needed
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Return access token and user profile
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
        // Lookup user in database
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) user = await prisma.user.findUnique({ where: { email: username } });
        // In a real app, verify hashed password here
        if (!user || user.password !== password) return res.status(401).json({ message: 'Invalid credentials' });
        // Create refresh token tied to user ID
        const refreshToken = await generateRefreshToken(user.id);
        console.log('Generated refresh token:', refreshToken);
        // Store refresh token in HTTP-only cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
        // Generate an access token
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
        // Check if username or email already exists
        const existingByUsername = await prisma.user.findUnique({ where: { username } });
        if (existingByUsername) {
            return res.status(409).json({ message: 'Username already taken' });
        }
        const existingByEmail = await prisma.user.findUnique({ where: { email } });
        if (existingByEmail) {
            return res.status(409).json({ message: 'Email already registered' });
        }
        // Create new user (note: in production, hash the password)
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