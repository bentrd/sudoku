// backend/workers/generate.js
const { parentPort, workerData } = require('worker_threads');
const Sudoku = require('../utils/Sudoku');
const SudokuSolver = require('../utils/SudokuSolver');
const { PrismaClient } = require('@prisma/client');
const { raw } = require('@prisma/client/runtime/library');

(async () => {
  const prisma = new PrismaClient();
  const generator = new Sudoku();
  const { difficulty, puzzle: puzzleParam } = workerData;

  let puzzleGrid;
  if (puzzleParam) {
    // load stored game or raw string
    if (puzzleParam.length === 81) {
      puzzleGrid = puzzleParam.split('').map(ch => (ch === '0' || ch === ' ' ? 0 : Number(ch)));
    } else {
      const game = await prisma.game.findUnique({ where: { id: Number(puzzleParam) } });
      puzzleGrid = game.puzzle.split('').map(ch => (ch === ' ' ? 0 : Number(ch)));
    }
  } else if (difficulty.toLowerCase() === 'random') {
    puzzleGrid = generator.generateRandomPuzzle();
  } else {
    puzzleGrid = generator.generatePuzzle(difficulty);
  }

  // prepare flat with [] for empties
  const flatOriginal = puzzleGrid.flat().map(n => n === 0 ? [] : n);

  // initial candidates merged
  const candidateSolver = new SudokuSolver(flatOriginal);
  candidateSolver.initializeCandidates();
  const mergedPuzzle = candidateSolver.puzzle.slice();

  // rate the puzzle
  const ratingSolver = new SudokuSolver(flatOriginal);
  const { solution: solvedFlat, techniques, difficulty: puzzleDifficulty } = ratingSolver.solve();
  const rating = puzzleDifficulty.score;
  const category = puzzleDifficulty.name;

  // formatting for DB
  const rawPuzzle = puzzleGrid.flat().map(n => n === 0 ? ' ' : String(n)).join('');
  const rawSolution = solvedFlat.map(n => n === 0 ? ' ' : String(n)).join('');

  let id = null;
  if (!puzzleParam) {
    const game = await prisma.game.create({
      data: { puzzle: rawPuzzle, solution: rawSolution, difficulty: rating, category, status: 'standalone' }
    });
    id = game.id;
  }

  await prisma.$disconnect();

  parentPort.postMessage({
    type: 'result', msg: {
      id,
      puzzle: mergedPuzzle,
      solution: solvedFlat,
      rating,
      category,
      techniques
    }
  });
})();