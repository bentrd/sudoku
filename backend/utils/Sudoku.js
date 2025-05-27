let parentPort;
try {
    // only defined when this module is run in a worker thread
    ({ parentPort } = require('worker_threads'));
} catch { }

const difficulties = require('../data/difficulties.json');
const SudokuSolver = require('./SudokuSolver');
const { randomInt } = require('crypto');

class Sudoku {
    constructor() { }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            // use crypto.randomInt to get a non-deterministic index per worker
            const j = randomInt(0, i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    generateFullGrid() {
        const grid = Array.from({ length: 9 }, () => Array(9).fill(0));

        const isValid = (row, col, num) => {
            for (let i = 0; i < 9; i++) {
                if (grid[row][i] === num || grid[i][col] === num) return false;
            }

            const startRow = Math.floor(row / 3) * 3;
            const startCol = Math.floor(col / 3) * 3;
            for (let r = startRow; r < startRow + 3; r++) {
                for (let c = startCol; c < startCol + 3; c++) {
                    if (grid[r][c] === num) return false;
                }
            }

            return true;
        };

        const fillGrid = () => {
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (grid[row][col] === 0) {
                        const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                        for (let num of numbers) {
                            if (isValid(row, col, num)) {
                                grid[row][col] = num;
                                if (fillGrid()) return true;
                                grid[row][col] = 0;
                            }
                        }
                        return false;
                    }
                }
            }
            return true;
        };

        const success = fillGrid();
        if (!success) throw new Error("Could not generate a complete grid");
        return grid;
    }

    hasUniqueSolution(grid) {
        let count = 0;

        const isValid = (row, col, num) => {
            for (let i = 0; i < 9; i++) {
                if (grid[row][i] === num || grid[i][col] === num) return false;
            }

            const startRow = Math.floor(row / 3) * 3;
            const startCol = Math.floor(col / 3) * 3;
            for (let r = startRow; r < startRow + 3; r++) {
                for (let c = startCol; c < startCol + 3; c++) {
                    if (grid[r][c] === num) return false;
                }
            }

            return true;
        };

        const solve = () => {
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    if (grid[row][col] === 0) {
                        for (let num = 1; num <= 9; num++) {
                            if (isValid(row, col, num)) {
                                grid[row][col] = num;
                                solve();
                                grid[row][col] = 0;
                            }
                        }
                        return;
                    }
                }
            }
            count++;
        };

        solve();
        return count === 1;
    }

    generatePuzzle(desiredDifficulty = 'Medium') {
        // Produce a full solved grid
        const fullGrid = this.generateFullGrid();
        // Copy to puzzle
        let puzzle = fullGrid.map(row => row.slice());
        // Build symmetric removal positions
        const positions = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                positions.push([row, col]);
            }
        }
        this.shuffleArray(positions);
        let removed = 0;
        let category = undefined;
        for (const [row, col] of positions) {
            const symRow = 8 - row;
            const symCol = 8 - col;
            const orig1 = puzzle[row][col];
            const orig2 = puzzle[symRow][symCol];
            // remove both
            puzzle[row][col] = 0;
            puzzle[symRow][symCol] = 0;
            // check uniqueness
            if (!this.hasUniqueSolution(puzzle.map(r => r.slice()))) {
                puzzle[row][col] = orig1;
                puzzle[symRow][symCol] = orig2;
                continue;
            }
            // rate difficulty via logical solver
            const flatCells = puzzle.flat().map(n => n === 0 ? [] : n);
            const solver = new SudokuSolver(flatCells);
            const { solution, difficulty } = solver.solve();
            category = difficulty.name;
            //parentPort.postMessage({ type: 'debug', msg: `${category}` });
            // revert if logic fails or too hard
            if (solution.some(cell => Array.isArray(cell))) {
                puzzle[row][col] = orig1;
                puzzle[symRow][symCol] = orig2;
            } else if (category === desiredDifficulty) {
                //parentPort.postMessage({ type: 'debug', msg: `Puzzle generated with difficulty: ${category}` });
                break;
            }
            if (++removed > 40) {
                //parentPort.postMessage({ type: 'debug', msg: `Failed to generate a puzzle with difficulty: ${desiredDifficulty} got ${category} instead` });
                break;
            }
        }
        if (category !== desiredDifficulty) {
            return this.generatePuzzle(desiredDifficulty);
        }
        return puzzle;
    }

    generateRandomPuzzle() {
        // first choose a random difficulty
        const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
        return this.generatePuzzle(difficulty.name);
    }

    generateRandomPuzzleWithTechnique(technique, maxAttempts = 100) {
        // first choose a random difficulty
        const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
        let attempts = 0;
        let puzzle;
        do {
            puzzle = this.generatePuzzle(difficulty.name);
            attempts++;
            const solver = new SudokuSolver(puzzle.flat());
            const { techniques } = solver.solve();
            if (techniques.includes(technique)) {
                console.log(`[${attempts}]Generated a puzzle with technique: ${technique} !`);
                break;
            } else {
                console.log(`[${attempts}]Failed to generate a puzzle with technique: ${technique}`);
            }
        } while (attempts < maxAttempts);
        if (attempts === maxAttempts) {
            console.log(`Failed to generate a puzzle with the desired technique. In ${maxAttempts} attempts.`);
            return this.generateRandomPuzzleWithTechnique(technique, maxAttempts);
        }
        return puzzle;
    }
}

module.exports = Sudoku;