// routes/sudoku.js
const express = require('express');
const router = express.Router();
const SudokuSolver = require('../utils/SudokuSolver');
const { PrismaClient } = require('@prisma/client');
const { Worker } = require('worker_threads');
const cookieParser = require('cookie-parser');

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

module.exports = router;