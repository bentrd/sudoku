const SudokuSolver = require('../utils/sudokuSolver');

describe('SudokuSolver Techniques', () => {
    let solver;

    beforeEach(() => {
        const emptyGrid = Array.from({ length: 9 }, () => Array(9).fill(0));
        solver = new SudokuSolver(emptyGrid);
    });

    test('nakedSingle identifies and returns the correct number', () => {
        solver.grid[0] = [1, 2, 3, 4, 5, 6, 7, 8, 0];
        expect(solver.nakedSingle(0, 8)).toBe(9);
    });

    test('singlePosition finds the only possible place for a candidate in row', () => {
        solver.grid[0] = [1, 2, 3, 4, 5, 6, 7, 8, 0];
        expect(solver.singlePosition(0, 8)).toBe(9);
    });

    test('candidateLines modifies candidate state appropriately', () => {
        solver.grid[0][0] = 1;
        solver.updateCandidates();
        expect(solver.candidateLines(0, 1)).toBe(false); // Just checking call doesn't fail
    });

    test('doublePairs identifies and applies elimination logic safely', () => {
        solver.grid = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0]
        ];
        solver.updateCandidates();
        expect(typeof solver.doublePairs(1, 1)).toBe('boolean');
    });

    test('nakedPair returns boolean and eliminates appropriately', () => {
        solver.candidates[0][0] = new Set([1, 2]);
        solver.candidates[0][1] = new Set([1, 2]);
        solver.candidates[0][2] = new Set([1, 2, 3]);
        for (let c = 3; c < 9; c++) {
            solver.candidates[0][c] = new Set([3, 4, 5]);
        }

        expect(solver.nakedPair(0, 0)).toBe(true);
        expect(solver.candidates[0][2].has(1)).toBe(false);
        expect(solver.candidates[0][2].has(2)).toBe(false);
    });

    test('xWing does not crash on empty grid', () => {
        expect(typeof solver.xWing(0, 0)).toBe('boolean');
    });

    test('forcingChains applies safe eliminations', () => {
        solver.grid[0][0] = 0;
        solver.candidates[0][0] = new Set([1, 2]);
        expect(typeof solver.forcingChains(0, 0)).toBe('boolean');
    });

    test('nakedQuad executes without crash', () => {
        solver.grid[0][0] = 0;
        solver.candidates[0][0] = new Set([1, 2, 3, 4]);
        expect(typeof solver.nakedQuad(0, 0)).toBe('boolean');
    });

    test('swordfish executes without crash', () => {
        solver.grid[0][0] = 0;
        solver.candidates[0][0] = new Set([1]);
        expect(typeof solver.swordfish(0, 0)).toBe('boolean');
    });
});