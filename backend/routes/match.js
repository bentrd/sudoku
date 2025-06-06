// backend/routes/match.js

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('../utils/AuthUtils');

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// In‐memory queue & map. (If the server restarts, the queue is lost.)
// ─────────────────────────────────────────────────────────────────────────────
const waitingQueue = []; // Array of userIds waiting
const pendingMatches = new Map();
// pendingMatches: userId → { matchId, gameId, puzzle, solution, difficulty, category }

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/match/join
//
// Request headers: Authorization: Bearer <accessToken>
// Body: (empty)
//
// - If there is already someone waiting, immediately pair them off.
//   * Generate a new Sudoku puzzle (using the same logic as /api/sudoku/generate).
//   * Insert a new Game row (with puzzle, solution, difficulty, category).
//   * Insert a new Match row linking both players + winner/loser null.
//   * Put both userIds into pendingMatches → so /status can pick it up.
//   * Return the new match object immediately to the caller.
// - If nobody is waiting, place userId in waitingQueue and return { status: 'waiting' }.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/join', requireAuth, async (req, res) => {
  const userA = req.userId;

  // 1) If this user is already “pending” (matched but not yet polled), bail:
  if (pendingMatches.has(userA)) {
    const matchInfo = pendingMatches.get(userA);
    return res.json({ status: 'matched', match: matchInfo });
  }

  // 2) If user is already in queue waiting, just return waiting:
  if (waitingQueue.includes(userA)) {
    return res.json({ status: 'waiting' });
  }

  // 3) If someone else is waiting, pair them:
  if (waitingQueue.length > 0) {
    const userB = waitingQueue.shift(); // remove the first waiting user

    // Generate via worker to reuse existing logic
    try {
      const { Worker } = require('worker_threads');
      const worker = new Worker(
        require('path').resolve(__dirname, '../workers/generate.js'),
        { workerData: { difficulty: 'Easy', puzzle: '' } }
      );

      worker.once('message', async (data) => {
        const { id: gameId, puzzle: flatPuzzleArr, solution: flatSolutionArr, rating: difficultyScore, category: categoryName } = data.msg;
        // flatPuzzleArr and flatSolutionArr are arrays of numbers or 0s; convert to strings
        const flatPuzzle = flatPuzzleArr.map(n => (n === 0 ? '0' : String(n))).join('');
        const flatSolution = flatSolutionArr.map(n => String(n)).join('');
        console.log(`Generated puzzle for match: ${flatPuzzle}`);

        // Create Match row linking these two players to existing Game (gameId)
        const newMatch = await prisma.match.create({
          data: {
            gameId: gameId,
            status: 'matched',
            participants: {
              create: [
                { userId: userA },
                { userId: userB },
              ],
            },
          },
          include: { participants: true },
        });

        const matchInfo = {
          matchId: newMatch.id,
          gameId,
          puzzle: flatPuzzle,
          solution: flatSolution,
          difficulty: difficultyScore,
          category: categoryName,
          opponent: userB === userA ? null : userB,
        };

        pendingMatches.set(userA, matchInfo);
        pendingMatches.set(userB, matchInfo);
        return res.json({ status: 'matched', match: matchInfo });
      });

      worker.once('error', err => {
        console.error('Worker error in match join:', err);
        // put userB back into queue
        waitingQueue.unshift(userB);
        return res.status(500).json({ message: 'Failed to create match' });
      });
      return; // <— add this return so we don’t fall through to pushing userA
    } catch (err) {
      console.error('Error pairing users in match:', err);
      waitingQueue.unshift(userB);
      return res.status(500).json({ message: 'Failed to create match' });
    }
  }

  // 4) Otherwise, nobody is waiting; put this user into the queue
  waitingQueue.push(userA);
  return res.json({ status: 'waiting' });
});


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/match/status
//
// Request headers: Authorization: Bearer <accessToken>
//
// - If the user has a pending match (in pendingMatches), return it.
// - Otherwise return { status: 'waiting' }.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/status', requireAuth, (req, res) => {
  const userId = req.userId;
  if (pendingMatches.has(userId)) {
    const matchInfo = pendingMatches.get(userId);
    return res.json({ status: 'matched', match: matchInfo });
  }
  return res.json({ status: 'waiting' });
});

// ─────────────────────────────────────────────────────────────────────────────────────────
// 1) LIST ALL MATCHES FOR LOGGED‐IN USER
// GET /api/match
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;

    // Find all MatchParticipant rows where userId = this user
    // Include their match, and inside each match include all participants (with user info)
    const participantRows = await prisma.matchParticipant.findMany({
      where: { userId: userId },
      include: {
        match: {
          include: {
            participants: {
              include: {
                user: true
              }
            },
            game: true  // if you ever want to expose puzzle/difficulty here
          }
        }
      }
    });

    // Turn that into a simple array: { matchId, opponentId, opponentName, status, puzzle (if needed) }
    const matches = participantRows.map((row) => {
      const match = row.match;

      // Find the “other” participant in this match
      const otherParticipant = match.participants.find(p => p.userId !== userId);
      const opponentId = otherParticipant ? otherParticipant.userId : null;
      const opponentName = otherParticipant && otherParticipant.user
        ? otherParticipant.user.username
        : null;

      return {
        matchId: match.id,
        status: match.status,
        opponent: opponentId,
        opponentName,
        // (Optionally send puzzle if you want to show a preview; otherwise omit)
        // puzzle: match.game.puzzle
      };
    });

    return res.json({ matches });
  } catch (err) {
    console.error('[/api/match] list error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// ─────────────────────────────────────────────────────────────────────────────────────────
// 2) GET A SINGLE MATCH (INCLUDING BOTH PARTICIPANTS’ BOARD STATES)
// GET /api/match/:matchId
router.get('/:matchId', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.userId;

    // Load the match, including both participants (with user info) and the underlying game puzzle
    const match = await prisma.match.findUnique({
      where: { id: Number(matchId) },
      include: {
        participants: {
          include: {
            user: true
          }
        },
        game: true
      }
    });
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Ensure the current user is one of the participants
    const isParticipant = match.participants.some(p => p.userId === userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not a participant in this match' });
    }

    // Build a response object that contains:
    //   • matchId
    //   • puzzle (string from game.puzzle)
    //   • participants: [ { userId, username, boardState } , ... ]
    const response = {
      matchId: match.id,
      puzzle: match.game.puzzle,
      gameId: match.game.id,
      participants: match.participants.map(p => ({
        userId: p.userId,
        username: p.user.username,
        boardState: p.boardState // this is a JSON array or “[]” if never edited
      })),
      winnerId: match.winnerId || null,
      timeTaken: match.timeTaken || null
    };

    return res.json(response);
  } catch (err) {
    console.error('[/api/match/:matchId] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


// ─────────────────────────────────────────────────────────────────────────────────────────
// 3) PATCH THE CURRENT USER’S BOARD STATE FOR A MATCH
// PATCH /api/match/:matchId/board
//
// Body: { boardState: <any JSON array> }
// This will overwrite the logged‐in user’s boardState in their MatchParticipant row.
router.patch('/:matchId/board', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.userId;
    const { boardState } = req.body;

    if (!Array.isArray(boardState)) {
      return res.status(400).json({ error: 'boardState must be a JSON array' });
    }

    // 1) Update this user's boardState
    const participant = await prisma.matchParticipant.findFirst({
      where: { matchId: Number(matchId), userId }
    });
    if (!participant) {
      return res.status(404).json({ error: 'Participant record not found' });
    }
    await prisma.matchParticipant.update({
      where: { id: participant.id },
      data: { boardState }
    });

    // 2) Load all participants for this match (including user info)
    const allParticipants = await prisma.matchParticipant.findMany({
      where: { matchId: Number(matchId) },
      include: { user: true }
    });

    // Fetch match (including game) to access solution and createdAt
    const matchRecord = await prisma.match.findUnique({
      where: { id: Number(matchId) },
      include: { game: true }
    });
    if (!matchRecord) {
      return res.status(404).json({ error: 'Match not found' });
    }

    // Convert this user's board to string of digits (empty as '0')
    const userCells = boardState;
    const boardString = userCells.map(c => c.digit ? String(c.digit) : '0').join('');
    const solutionString = matchRecord.game.solution;

    // If the board matches the solution, mark winner/loser and timeTaken (only if not already set)
    // merge boardstring with initial puzzle to add givens
    const initialPuzzle = matchRecord.game.puzzle;
    const boardWithGivens = initialPuzzle.split('').map((ch, i) => {
      return ch !== '0' && ch !== ' ' ? ch : boardString[i];
    }).join('');
    console.log(boardWithGivens, solutionString);
    console.log(boardWithGivens === solutionString ? 'Match completed!' : 'Still in progress');
    if (boardWithGivens === solutionString) {
      console.log(`User ${userId} completed match ${matchId} successfully!`);
      // Only update if no winner yet
      if (!matchRecord.winnerId) {
        // Determine the other participant's userId
        const other = allParticipants.find(p => p.userId !== userId);
        const now = new Date();
        const start = matchRecord.createdAt;
        const timeTaken = Math.floor((now.getTime() - start.getTime()) / 1000);

        await prisma.match.update({
          where: { id: Number(matchId) },
          data: {
            winnerId: userId,
            loserId: other ? other.userId : null,
            timeTaken
          }
        });
        // Refresh matchRecord to reflect new winnerId
        matchRecord.winnerId = userId;
        matchRecord.timeTaken = timeTaken;
      }
    }

    // Helper to detect conflicts on a 9x9 Sudoku grid stored in boardState
    const boardHasMistake = (cells) => {
      const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
      for (let i = 0; i < 81; i++) {
        const r = Math.floor(i / 9);
        const c = i % 9;
        const cellValue = (cells[i]?.digit) || 0;
        const puzzleValue = matchRecord.game.puzzle[i];
        grid[r][c] = cellValue || parseInt(puzzleValue) || 0;
      }
      const seen = new Set();
      // Check rows
      for (let r = 0; r < 9; r++) {
        seen.clear();
        for (let c = 0; c < 9; c++) {
          const val = grid[r][c];
          if (val === 0) continue;
          if (seen.has(val)) return true;
          seen.add(val);
        }
      }
      // Check columns
      for (let c = 0; c < 9; c++) {
        seen.clear();
        for (let r = 0; r < 9; r++) {
          const val = grid[r][c];
          if (val === 0) continue;
          if (seen.has(val)) return true;
          seen.add(val);
        }
      }
      // Check 3x3 boxes
      for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {
          seen.clear();
          for (let r = br * 3; r < br * 3 + 3; r++) {
            for (let c = bc * 3; c < bc * 3 + 3; c++) {
              const val = grid[r][c];
              if (val === 0) continue;
              if (seen.has(val)) return true;
              seen.add(val);
            }
          }
        }
      }
      return false;
    };

    // Count number of empty squares in the puzzle
    const totalEmpty = matchRecord.game.puzzle.split('').filter(ch => Number(ch) === 0).length;

    // 3) Compute progress & mistake for each participant
    const responseParticipants = allParticipants.map(p => {
      const cells = p.boardState;
      let filled = 0;
      for (const cell of cells) {
        if (cell.digit >= 1 && cell.digit <= 9) filled++;
      }
      const progress = totalEmpty > 0 ? filled / totalEmpty : 0;
      const hasMistake = boardHasMistake(cells);
      return {
        userId: p.userId,
        username: p.username,
        boardState: cells,
        progress,
        hasMistake,
      };
    });

    const winnerId = matchRecord.winnerId || null;
    const timeTaken = matchRecord.timeTaken || null;

    return res.json({
      participants: responseParticipants,
      winnerId,
      timeTaken,
    });
  } catch (err) {
    console.error('[/api/match/:matchId/board] error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;