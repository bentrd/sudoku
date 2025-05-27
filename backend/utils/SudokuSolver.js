// utils/sudokuSolver.js
const difficulties = require('../data/difficulties.json');

class SudokuSolver {
  constructor(puzzle) {
    // Track which cells were involved in the last technique (81-element mask)
    this.lastInvolved = Array(81).fill(0);
    // puzzle: array of 81 elements, either a number or an array of candidates
    this.puzzle = puzzle.slice();
    this.techniquesUsed = [];  // { name, count, involved }
    this.score = 0;
    // Ordered list of techniques to apply
    this.techniqueOrder = [
      // Naked singles
      { name: 'Naked Single', method: this.applyNakedSingle.bind(this), score: 5 },
      // Hidden singles
      { name: 'Hidden Single', method: this.applyHiddenSingles.bind(this), score: 5 },
      // Naked pairs
      { name: 'Naked Pair', method: this.applyNakedPairs.bind(this), score: 10 },
      // Naked triples
      { name: 'Naked Triple', method: this.applyNakedTriples.bind(this), score: 10 },
      // Hidden pairs
      { name: 'Hidden Pair', method: this.applyHiddenPairs.bind(this), score: 20 },
      // Hidden triples
      { name: 'Hidden Triple', method: this.applyHiddenTriples.bind(this), score: 20 },
      // Naked quads
      { name: 'Naked Quad', method: this.applyNakedQuads.bind(this), score: 10 },
      // Hidden quads
      { name: 'Hidden Quad', method: this.applyHiddenQuads.bind(this), score: 20 },
      // Pointing pairs
      { name: 'Pointing Pairs', method: this.applyPointingPairs.bind(this), score: 30 },
      // Box/Line Reduction
      { name: 'Box/Line Reduction', method: this.applyBoxLineReduction.bind(this), score: 30 },
      // X-Wing
      { name: 'X-Wing', method: this.applyXWing.bind(this), score: 50 },
      // Chute Remote Pairs
      { name: 'Chute Remote Pairs', method: this.applyChuteRemotePairs.bind(this), score: 100 },
      // Simple Coloring
      { name: 'Simple Coloring', method: this.applySimpleColoring.bind(this), score: 150 },
      // Y-Wing
      { name: 'Y-Wing', method: this.applyYWing.bind(this), score: 150 },
      // Rectangle Elimination
      { name: 'Rectangle Elimination', method: this.applyRectangleElimination.bind(this), score: 200 },
      // Swordfish
      { name: 'Swordfish', method: this.applySwordfish.bind(this), score: 200 },
      // XYZ-Wing
      { name: 'XYZ-Wing', method: this.applyXYZWing.bind(this), score: 250 },
      // BUG
      { name: 'BUG', method: this.applyBUG.bind(this), score: 250 },
      // XY-Chain
      { name: 'XY-Chain', method: this.applyXYChain.bind(this), score: 300 },
    ];
    this.markInvolved = (...idxs) => {
      idxs.forEach(i => { if (i >= 0 && i < 81) this.lastInvolved[i] = 1; });
    };
  }

  solve() {
    this.initializeCandidates();
    this.techniquesUsed.push({ name: 'Initial Candidates', puzzle: this.puzzle.slice(), involved: Array(81).fill(0) });
    let progress = true;
    while (progress) {
      progress = false;
      for (const tech of this.techniqueOrder) {
        // reset involved-cell mask before running technique
        this.lastInvolved = Array(81).fill(0);
        if (tech.method()) {
          this.useTechnique(tech.name, this.puzzle.slice(), this.lastInvolved.slice());
          progress = true;
          break;
        }
      }
    }
    return {
      solution: this.puzzle,
      techniques: this.techniquesUsed,
      difficulty: this.getDifficultyScore()
    };
  }

  initializeCandidates() {
    for (let i = 0; i < 81; i++) {
      if (typeof this.puzzle[i] === 'number') continue;
      this.puzzle[i] = this.getCandidates(i);
    }
  }

  getCandidates(idx) {
    const used = new Set();
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    // row
    for (let c = 0; c < 9; c++) {
      const v = this.puzzle[row * 9 + c];
      if (typeof v === 'number') used.add(v);
    }
    // col
    for (let r = 0; r < 9; r++) {
      const v = this.puzzle[r * 9 + col];
      if (typeof v === 'number') used.add(v);
    }
    // box
    const br = 3 * Math.floor(row / 3);
    const bc = 3 * Math.floor(col / 3);
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const v = this.puzzle[(br + dr) * 9 + (bc + dc)];
        if (typeof v === 'number') used.add(v);
      }
    }
    const cands = [];
    for (let n = 1; n <= 9; n++) if (!used.has(n)) cands.push(n);
    return cands;
  }

  setCell(idx, val) {
    if (Array.isArray(val)) {
      this.puzzle[idx] = val;
      return;
    }
    this.markInvolved(idx);
    this.puzzle[idx] = val;
    const row = Math.floor(idx / 9);
    const col = idx % 9;
    const br = 3 * Math.floor(row / 3);
    const bc = 3 * Math.floor(col / 3);
    // eliminate from row and col
    for (let i = 0; i < 9; i++) {
      this.eliminate(idx = row * 9 + i, val);
      this.eliminate(idx = i * 9 + col, val);
    }
    // eliminate from box
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        this.eliminate((br + dr) * 9 + (bc + dc), val);
      }
    }
  }

  eliminate(idx, val) {
    if (Array.isArray(this.puzzle[idx])) {
      this.puzzle[idx] = this.puzzle[idx].filter(n => n !== val);
    }
  }

  useTechnique(name, puzzle, involved = []) {
    const meta = this.techniqueOrder.find(t => t.name === name);
    if (!meta) return;
    const existing = this.techniquesUsed.find(t => t.name === name);
    // record the technique with its resulting puzzle state and involved cells
    this.techniquesUsed.push({ name, puzzle, involved });
    if (!existing) {
      this.score += meta.score;
    }
  }

  getDifficultyScore() {
    const score = this.score;
    // find matching difficulty, a difficulty is an object with a name and a maxScore
    const difficulty = difficulties.find(d => d.maxScore >= score && 20 <= score);
    if (difficulty) {
      return { name: difficulty.name, score };
    } else {
      return { name: 'Unknown', score };
    }
  }

  // Helper to determine if two cells see each other (same row, col, or box)
  sees(a, b) {
    const ra = Math.floor(a / 9), ca = a % 9;
    const rb = Math.floor(b / 9), cb = b % 9;
    return ra === rb || ca === cb ||
      (Math.floor(ra / 3) === Math.floor(rb / 3) && Math.floor(ca / 3) === Math.floor(cb / 3));
  }

  // Techniques

  // Naked Single: if a cell has only one candidate, set it
  applyNakedSingle() {
    // Gather all single-candidate cells
    const singles = [];
    for (let i = 0; i < 81; i++) {
      if (Array.isArray(this.puzzle[i]) && this.puzzle[i].length === 1) {
        singles.push(i);
      }
    }
    // If none, nothing to do
    if (singles.length === 0) return false;
    // Apply all at once
    this.lastInvolved = Array(81).fill(0);
    singles.forEach(i => {
      this.setCell(i, this.puzzle[i][0]);
    });
    return true;
  }

  // Hidden Single: if a candidate appears only once in a unit (row, col, box), set it
  applyHiddenSingles() {
    const checkUnit = unit => {
      const map = {};
      unit.forEach(i => {
        if (Array.isArray(this.puzzle[i])) {
          this.puzzle[i].forEach(n => (map[n] = map[n] || []).push(i));
        }
      });
      for (const n in map) {
        if (map[n].length === 1) {
          this.setCell(map[n][0], +n);
          return true;
        }
      }
      return false;
    };
    // rows
    for (let r = 0; r < 9; r++) if (checkUnit(Array.from({ length: 9 }, (_, c) => r * 9 + c))) return true;
    // cols
    for (let c = 0; c < 9; c++) if (checkUnit(Array.from({ length: 9 }, (_, r) => r * 9 + c))) return true;
    // boxes
    for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) {
      const unit = [];
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) unit.push((br * 3 + dr) * 9 + (bc * 3 + dc));
      if (checkUnit(unit)) return true;
    }
    return false;
  }

  // Naked Pair: if two cells in a unit have the same two candidates, remove those candidates from other cells in the unit
  applyNakedPairs() {
    const process = unit => {
      const pairs = unit.filter(i => Array.isArray(this.puzzle[i]) && this.puzzle[i].length === 2);
      for (let a = 0; a < pairs.length; a++) for (let b = a + 1; b < pairs.length; b++) {
        const [i, j] = [pairs[a], pairs[b]];
        if (this.puzzle[i][0] === this.puzzle[j][0] && this.puzzle[i][1] === this.puzzle[j][1]) {
          // mark the two cells forming the naked pair
          const rem = new Set(this.puzzle[i]);
          let changed = false;
          unit.forEach(k => {
            if (![i, j].includes(k) && Array.isArray(this.puzzle[k])) {
              const f = this.puzzle[k].filter(n => !rem.has(n));
              if (f.length !== this.puzzle[k].length) {
                this.markInvolved(i, j);
                this.puzzle[k] = f;
                changed = true;
              }
            }
          });
          if (changed) return true;
        }
      }
      return false;
    };
    // rows, cols, boxes
    for (let r = 0; r < 9; r++) if (process(Array.from({ length: 9 }, (_, c) => r * 9 + c))) return true;
    for (let c = 0; c < 9; c++) if (process(Array.from({ length: 9 }, (_, r) => r * 9 + c))) return true;
    for (let br = 0; br < 3; br++)for (let bc = 0; bc < 3; bc++) {
      const unit = [];
      for (let dr = 0; dr < 3; dr++)for (let dc = 0; dc < 3; dc++)unit.push((br * 3 + dr) * 9 + (bc * 3 + dc));
      if (process(unit)) return true;
    }
    return false;
  }

  // Naked Triple: if three cells in a unit have the same three candidates, remove those candidates from other cells in the unit
  applyNakedTriples() {
    const process = unit => {
      const cells = unit.filter(i => Array.isArray(this.puzzle[i]) && [2, 3].includes(this.puzzle[i].length));
      for (let a = 0; a < cells.length; a++) for (let b = a + 1; b < cells.length; b++) for (let c = b + 1; c < cells.length; c++) {
        const idxs = [cells[a], cells[b], cells[c]];
        const union = new Set(idxs.flatMap(i => this.puzzle[i]));
        if (union.size === 3) {
          let changed = false;
          unit.forEach(k => {
            if (!idxs.includes(k) && Array.isArray(this.puzzle[k])) {
              const f = this.puzzle[k].filter(n => !union.has(n));
              if (f.length !== this.puzzle[k].length) {
                this.markInvolved(...idxs);
                this.puzzle[k] = f;
                changed = true;
              }
            }
          });
          if (changed) return true;
        }
      }
      return false;
    };
    for (let r = 0; r < 9; r++) if (process(Array.from({ length: 9 }, (_, c) => r * 9 + c))) return true;
    for (let c = 0; c < 9; c++) if (process(Array.from({ length: 9 }, (_, r) => r * 9 + c))) return true;
    for (let br = 0; br < 3; br++)for (let bc = 0; bc < 3; bc++) {
      const unit = [];
      for (let dr = 0; dr < 3; dr++)
        for (let dc = 0; dc < 3; dc++)
          unit.push((br * 3 + dr) * 9 + (bc * 3 + dc));
      if (process(unit)) return true;
    }
    return false;
  }

  // Hidden Pair: if two candidates appear exclusively in the same two cells of a unit, remove those candidates from other cells in the unit
  applyHiddenPairs() {
    const process = unit => {
      const map = {};
      unit.forEach(i => {
        if (Array.isArray(this.puzzle[i])) {
          this.puzzle[i].forEach(n => (map[n] = map[n] || []).push(i));
        }
      });
      const pairs = Object.entries(map).filter(([, ix]) => ix.length === 2).map(([n, ix]) => ({ n: +n, ixs: ix }));
      for (let a = 0; a < pairs.length; a++)for (let b = a + 1; b < pairs.length; b++) {
        const p = pairs[a], q = pairs[b];
        if (p.ixs[0] === q.ixs[0] && p.ixs[1] === q.ixs[1]) {
          let changed = false, keep = [p.n, q.n];
          p.ixs.forEach(i => {
            const f = this.puzzle[i].filter(x => keep.includes(x));
            if (f.length !== this.puzzle[i].length) { this.puzzle[i] = f; changed = true; }
          });
          if (changed) {
            this.markInvolved(...p.ixs);
            return true;
          }
        }
      }
      return false;
    };
    for (let r = 0; r < 9; r++) if (process(Array.from({ length: 9 }, (_, c) => r * 9 + c))) return true;
    for (let c = 0; c < 9; c++) if (process(Array.from({ length: 9 }, (_, r) => r * 9 + c))) return true;
    for (let br = 0; br < 3; br++)for (let bc = 0; bc < 3; bc++) { const unit = []; for (let dr = 0; dr < 3; dr++)for (let dc = 0; dc < 3; dc++)unit.push((br * 3 + dr) * 9 + (bc * 3 + dc)); if (process(unit)) return true; }
    return false;
  }

  // Hidden Triple: if three candidates appear exclusively in the same three cells of a unit, remove those candidates from other cells in the unit
  applyHiddenTriples() {
    const process = unit => {
      const map = {};
      unit.forEach(i => {
        if (Array.isArray(this.puzzle[i])) this.puzzle[i].forEach(n => (map[n] = map[n] || []).push(i));
      });
      const nums = Object.entries(map).filter(([, ix]) => ix.length >= 2 && ix.length <= 3).map(([n, ix]) => ({ n: +n, ixs: ix }));
      for (let a = 0; a < nums.length; a++)for (let b = a + 1; b < nums.length; b++)for (let c = b + 1; c < nums.length; c++) {
        const combo = [nums[a], nums[b], nums[c]];
        const pos = [...new Set(combo.flatMap(x => x.ixs))];
        if (pos.length === 3) {
          let changed = false, keep = combo.map(x => x.n);
          pos.forEach(i => {
            const f = this.puzzle[i].filter(x => keep.includes(x));
            if (f.length !== this.puzzle[i].length) { this.puzzle[i] = f; changed = true; }
          });
          if (changed) {
            this.markInvolved(...pos);
            return true;
          }
        }
      }
      return false;
    };
    for (let r = 0; r < 9; r++) if (process(Array.from({ length: 9 }, (_, c) => r * 9 + c))) return true;
    for (let c = 0; c < 9; c++) if (process(Array.from({ length: 9 }, (_, r) => r * 9 + c))) return true;
    for (let br = 0; br < 3; br++)for (let bc = 0; bc < 3; bc++) { const unit = []; for (let dr = 0; dr < 3; dr++)for (let dc = 0; dc < 3; dc++)unit.push((br * 3 + dr) * 9 + (bc * 3 + dc)); if (process(unit)) return true; }
    return false;
  }

  // Naked Quad: if four cells in a unit have the same four candidates, remove those candidates from other cells in the unit
  applyNakedQuads() {
    const process = unit => {
      const cells = unit.filter(i => Array.isArray(this.puzzle[i]) && this.puzzle[i].length >= 2 && this.puzzle[i].length <= 4);
      for (let a = 0; a < cells.length; a++) {
        for (let b = a + 1; b < cells.length; b++) {
          for (let c = b + 1; c < cells.length; c++) {
            for (let d = c + 1; d < cells.length; d++) {
              const idxs = [cells[a], cells[b], cells[c], cells[d]];
              const union = new Set(idxs.flatMap(i => this.puzzle[i]));
              if (union.size === 4) {
                let changed = false;
                unit.forEach(k => {
                  if (!idxs.includes(k) && Array.isArray(this.puzzle[k])) {
                    const filtered = this.puzzle[k].filter(n => !union.has(n));
                    if (filtered.length !== this.puzzle[k].length) {
                      this.puzzle[k] = filtered;
                      changed = true;
                      this.markInvolved(...idxs);
                    }
                  }
                });
                if (changed) return true;
              }
            }
          }
        }
      }
      return false;
    };
    // rows
    for (let r = 0; r < 9; r++) if (process(Array.from({ length: 9 }, (_, c) => r * 9 + c))) return true;
    // cols
    for (let c = 0; c < 9; c++) if (process(Array.from({ length: 9 }, (_, r) => r * 9 + c))) return true;
    // boxes
    for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) {
      const unit = [];
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) unit.push((br * 3 + dr) * 9 + (bc * 3 + dc));
      if (process(unit)) return true;
    }
    return false;
  }

  // Hidden Quad: if four candidates appear exclusively in the same four cells of a unit, remove those candidates from other cells in the unit
  applyHiddenQuads() {
    const process = unit => {
      const map = {};
      unit.forEach(i => {
        if (Array.isArray(this.puzzle[i])) {
          this.puzzle[i].forEach(n => (map[n] = map[n] || []).push(i));
        }
      });
      const nums = Object.entries(map)
        .filter(([, idxs]) => idxs.length >= 1 && idxs.length <= 4)
        .map(([n, idxs]) => ({ n: +n, idxs }));
      for (let a = 0; a < nums.length; a++) {
        for (let b = a + 1; b < nums.length; b++) {
          for (let c = b + 1; c < nums.length; c++) {
            for (let d = c + 1; d < nums.length; d++) {
              const combo = [nums[a], nums[b], nums[c], nums[d]];
              const positions = [...new Set(combo.flatMap(x => x.idxs))];
              if (positions.length === 4) {
                let changed = false;
                const keep = combo.map(x => x.n);
                positions.forEach(i => {
                  if (Array.isArray(this.puzzle[i])) {
                    const filtered = this.puzzle[i].filter(x => keep.includes(x));
                    if (filtered.length !== this.puzzle[i].length) {
                      this.puzzle[i] = filtered;
                      changed = true;
                    }
                  }
                });
                if (changed) return true;
              }
            }
          }
        }
      }
      return false;
    };
    // rows, cols, boxes
    for (let r = 0; r < 9; r++) if (process(Array.from({ length: 9 }, (_, c) => r * 9 + c))) return true;
    for (let c = 0; c < 9; c++) if (process(Array.from({ length: 9 }, (_, r) => r * 9 + c))) return true;
    for (let br = 0; br < 3; br++) for (let bc = 0; bc < 3; bc++) {
      const unit = [];
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) unit.push((br * 3 + dr) * 9 + (bc * 3 + dc));
      if (process(unit)) return true;
    }
    return false;
  }

  // Pointing Pairs: if a candidate appears only in one row/column of a box, remove it from other cells in that row/column
  applyPointingPairs() {
    // For each 3×3 box
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        const boxRowStart = br * 3;
        const boxColStart = bc * 3;
        // Check each candidate digit
        for (let num = 1; num <= 9; num++) {
          const positions = [];
          // Collect cells in this box containing num
          for (let dr = 0; dr < 3; dr++) {
            for (let dc = 0; dc < 3; dc++) {
              const idx = (boxRowStart + dr) * 9 + (boxColStart + dc);
              if (Array.isArray(this.puzzle[idx]) && this.puzzle[idx].includes(num)) {
                positions.push(idx);
              }
            }
          }
          if (positions.length > 1) {
            const rows = new Set(positions.map(i => Math.floor(i / 9)));
            const cols = new Set(positions.map(i => i % 9));
            // Pointing in row: collect all eliminations then apply
            if (rows.size === 1) {
              const row = [...rows][0];
              const elim = [];
              // gather outside-box cells in same row
              for (let c = 0; c < 9; c++) {
                if (c < boxColStart || c >= boxColStart + 3) {
                  const idx2 = row * 9 + c;
                  if (Array.isArray(this.puzzle[idx2]) && this.puzzle[idx2].includes(num)) {
                    elim.push(idx2);
                  }
                }
              }
              if (elim.length > 0) {
                // mark the box cells and the eliminated cells
                this.markInvolved(...positions);
                // apply all eliminations at once
                elim.forEach(idx2 => {
                  this.puzzle[idx2] = this.puzzle[idx2].filter(n => n !== num);
                });
                return true;
              }
            }
            // Pointing in column: collect all eliminations then apply
            if (cols.size === 1) {
              const col = [...cols][0];
              const elim = [];
              // gather outside-box cells in same column
              for (let r = 0; r < 9; r++) {
                if (r < boxRowStart || r >= boxRowStart + 3) {
                  const idx2 = r * 9 + col;
                  if (Array.isArray(this.puzzle[idx2]) && this.puzzle[idx2].includes(num)) {
                    elim.push(idx2);
                  }
                }
              }
              if (elim.length > 0) {
                // mark the box cells and the eliminated cells
                this.markInvolved(...positions);
                // apply all eliminations at once
                elim.forEach(idx2 => {
                  this.puzzle[idx2] = this.puzzle[idx2].filter(n => n !== num);
                });
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  // Box/Line Reduction: eliminate candidates in a box when confined to one row/column
  applyBoxLineReduction() {
    // Rows -> box
    for (let r = 0; r < 9; r++) {
      for (let num = 1; num <= 9; num++) {
        const positions = [];
        for (let c = 0; c < 9; c++) {
          const idx = r * 9 + c;
          if (Array.isArray(this.puzzle[idx]) && this.puzzle[idx].includes(num)) {
            positions.push(idx);
          }
        }
        if (positions.length > 1) {
          const boxRows = new Set(positions.map(i => Math.floor(i / 9 / 3)));
          const boxCols = new Set(positions.map(i => Math.floor((i % 9) / 3)));
          if (boxRows.size === 1 && boxCols.size === 1) {
            // confined to single box
            const br = [...boxRows][0] * 3;
            const bc = [...boxCols][0] * 3;
            // Collect all elimination targets in this box
            const elim = [];
            for (let dr = 0; dr < 3; dr++) {
              for (let dc = 0; dc < 3; dc++) {
                const idx2 = (br + dr) * 9 + (bc + dc);
                const rr = Math.floor(idx2 / 9);
                if (rr !== r && Array.isArray(this.puzzle[idx2]) && this.puzzle[idx2].includes(num)) {
                  elim.push(idx2);
                }
              }
            }
            if (elim.length > 0) {
              // mark the source positions and all eliminated cells
              this.markInvolved(...positions);
              // apply all eliminations at once
              elim.forEach(idx2 => {
                this.puzzle[idx2] = this.puzzle[idx2].filter(n => n !== num);
              });
              return true;
            }
          }
        }
      }
    }
    // Columns -> box
    for (let c = 0; c < 9; c++) {
      for (let num = 1; num <= 9; num++) {
        const positions = [];
        for (let r = 0; r < 9; r++) {
          const idx = r * 9 + c;
          if (Array.isArray(this.puzzle[idx]) && this.puzzle[idx].includes(num)) {
            positions.push(idx);
          }
        }
        if (positions.length > 1) {
          const boxRows = new Set(positions.map(i => Math.floor(i / 9 / 3)));
          const boxCols = new Set(positions.map(i => Math.floor((i % 9) / 3)));
          if (boxRows.size === 1 && boxCols.size === 1) {
            const br = [...boxRows][0] * 3;
            const bc = [...boxCols][0] * 3;
            // Collect all elimination targets in this box
            const elim = [];
            for (let dr = 0; dr < 3; dr++) {
              for (let dc = 0; dc < 3; dc++) {
                const idx2 = (br + dr) * 9 + (bc + dc);
                const cc = idx2 % 9;
                if (cc !== c && Array.isArray(this.puzzle[idx2]) && this.puzzle[idx2].includes(num)) {
                  elim.push(idx2);
                }
              }
            }
            if (elim.length > 0) {
              // mark the source positions and all eliminated cells
              this.markInvolved(...positions);
              // apply all eliminations at once
              elim.forEach(idx2 => {
                this.puzzle[idx2] = this.puzzle[idx2].filter(n => n !== num);
              });
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // X-Wing strategy: eliminate candidates in rows/columns via X-Wing patterns
  applyXWing() {
    let changed = false;
    // Row-based X-Wing
    for (let num = 1; num <= 9; num++) {
      const rowPositions = [];
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++) {
          const idx = r * 9 + c;
          if (Array.isArray(this.puzzle[idx]) && this.puzzle[idx].includes(num)) {
            cols.push(c);
          }
        }
        if (cols.length === 2) rowPositions.push({ r, cols });
      }
      for (let i = 0; i < rowPositions.length; i++) {
        for (let j = i + 1; j < rowPositions.length; j++) {
          const a = rowPositions[i], b = rowPositions[j];
          if (a.cols[0] === b.cols[0] && a.cols[1] === b.cols[1]) {
            // eliminate from other rows in those two columns
            for (let r = 0; r < 9; r++) {
              if (r !== a.r && r !== b.r) {
                for (const c of a.cols) {
                  const idx = r * 9 + c;
                  if (Array.isArray(this.puzzle[idx]) && this.puzzle[idx].includes(num)) {
                    this.puzzle[idx] = this.puzzle[idx].filter(n => n !== num);
                    changed = true;
                    this.markInvolved(a.r * 9 + a.cols[0], a.r * 9 + a.cols[1], b.r * 9 + b.cols[0], b.r * 9 + b.cols[1]);
                  }
                }
              }
            }
          }
        }
      }
    }
    // Column-based X-Wing
    for (let num = 1; num <= 9; num++) {
      const colPositions = [];
      for (let c = 0; c < 9; c++) {
        const rows = [];
        for (let r = 0; r < 9; r++) {
          const idx = r * 9 + c;
          if (Array.isArray(this.puzzle[idx]) && this.puzzle[idx].includes(num)) {
            rows.push(r);
          }
        }
        if (rows.length === 2) colPositions.push({ c, rows });
      }
      for (let i = 0; i < colPositions.length; i++) {
        for (let j = i + 1; j < colPositions.length; j++) {
          const a = colPositions[i], b = colPositions[j];
          if (a.rows[0] === b.rows[0] && a.rows[1] === b.rows[1]) {
            // eliminate from other columns in those two rows
            for (let c = 0; c < 9; c++) {
              if (c !== a.c && c !== b.c) {
                for (const r of a.rows) {
                  const idx = r * 9 + c;
                  if (Array.isArray(this.puzzle[idx]) && this.puzzle[idx].includes(num)) {
                    this.puzzle[idx] = this.puzzle[idx].filter(n => n !== num);
                    changed = true;
                    this.markInvolved(a.c + r * 9, b.c + r * 9, a.c + b.rows[0] * 9, a.c + b.rows[1] * 9);
                  }
                }
              }
            }
          }
        }
      }
    }
    return changed;
  }

  // Y-Wing strategy: eliminate candidates via pivot-and-pincer logic
  applyYWing() {
    // For each pivot cell with exactly two candidates
    for (let pivot = 0; pivot < 81; pivot++) {
      const cell = this.puzzle[pivot];
      if (!Array.isArray(cell) || cell.length !== 2) continue;
      const [x, y] = cell;
      const pr = Math.floor(pivot / 9), pc = pivot % 9;

      // Gather pincers: cells that see pivot and share one candidate
      const pincerX = [], pincerY = [];
      for (let j = 0; j < 81; j++) {
        const c = this.puzzle[j];
        if (!Array.isArray(c) || c.length !== 2) continue;
        const jr = Math.floor(j / 9), jc = j % 9;
        const sameRow = (jr === pr), sameCol = (jc === pc),
          sameBox = (Math.floor(jr / 3) === Math.floor(pr / 3) &&
            Math.floor(jc / 3) === Math.floor(pc / 3));
        if (!(sameRow || sameCol || sameBox)) continue;
        // check which candidate it shares
        if (c.includes(x) && !c.includes(y)) {
          const other = c[0] === x ? c[1] : c[0];
          pincerX.push({ idx: j, other, pivot });
        }
        if (c.includes(y) && !c.includes(x)) {
          const other = c[0] === y ? c[1] : c[0];
          pincerY.push({ idx: j, other, pivot });
        }
      }

      // For each X/Y pincer pair with same “other” (z), eliminate z from cells that see both
      for (const px of pincerX) {
        for (const py of pincerY) {
          if (px.other !== py.other) continue;
          // Skip if the two pincers lie in the same unit (row, column, or box)
          const xr = Math.floor(px.idx / 9), xc = px.idx % 9;
          const yr = Math.floor(py.idx / 9), yc = py.idx % 9;
          const sameRow = xr === yr;
          const sameCol = xc === yc;
          const sameBox = Math.floor(xr / 3) === Math.floor(yr / 3) && Math.floor(xc / 3) === Math.floor(yc / 3);
          if (sameRow || sameCol || sameBox) continue;
          const z = px.other;
          for (let m = 0; m < 81; m++) {
            const cm = this.puzzle[m];
            if (!Array.isArray(cm) || !cm.includes(z)) continue;
            const mr = Math.floor(m / 9), mc = m % 9;
            const sees = idx => {
              const r = Math.floor(idx / 9), c = idx % 9;
              return r === mr || c === mc ||
                (Math.floor(r / 3) === Math.floor(mr / 3) &&
                  Math.floor(c / 3) === Math.floor(mc / 3));
            };
            if (sees(px.idx) && sees(py.idx)) {
              this.puzzle[m] = cm.filter(n => n !== z);
              this.markInvolved(px.idx, py.idx, px.pivot, py.pivot);
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // Chute Remote Pairs: identical bivalue cells in two boxes of a chute, eliminate present candidate in yellow cells
  applyChuteRemotePairs() {
    // Chute Remote Pairs: identical bivalue cells in two boxes of a chute
    for (const isRow of [true, false]) {
      for (let band = 0; band < 3; band++) {
        // Collect all bivalue cells in this chute
        const cells = [];
        for (let i = 0; i < 9; i++) {
          const r = isRow ? band * 3 + (i % 3) : i;
          const c = isRow ? i : band * 3 + (i % 3);
          const idx = r * 9 + c;
          const cell = this.puzzle[idx];
          if (Array.isArray(cell) && cell.length === 2) cells.push(idx);
        }
        // Group by candidate pair
        const groups = {};
        for (const idx of cells) {
          const [a, b] = this.puzzle[idx];
          const key = a < b ? `${a},${b}` : `${b},${a}`;
          (groups[key] = groups[key] || []).push(idx);
        }
        // Process each remote pair
        for (const key in groups) {
          const pts = groups[key];
          if (pts.length !== 2) continue;
          const [p1, p2] = pts;
          if (this.sees(p1, p2)) continue;
          const [x, y] = key.split(',').map(Number);
          // Determine the third box index within this chute
          const box1 = isRow ? Math.floor((p1 % 9) / 3) : Math.floor(Math.floor(p1 / 9) / 3);
          const box2 = isRow ? Math.floor((p2 % 9) / 3) : Math.floor(Math.floor(p2 / 9) / 3);
          const missingBox = [0, 1, 2].find(b => b !== box1 && b !== box2);
          // Yellow cells: in the third box AND in the chute AND do NOT see either p1 or p2
          const yellow = [];
          for (let k = 0; k < 81; k++) {
            const r = Math.floor(k / 9), c = k % 9;
            const inChute = isRow ? (r >= band * 3 && r < band * 3 + 3)
              : (c >= band * 3 && c < band * 3 + 3);
            const box = isRow ? Math.floor(c / 3) : Math.floor(r / 3);
            if (inChute && box === missingBox &&
              !this.sees(p1, k) && !this.sees(p2, k)) {
              yellow.push(k);
            }
          }
          if (yellow.length === 0) continue;
          // Check which of the pair candidates appears in yellow
          const presentX = yellow.some(k =>
            (typeof this.puzzle[k] === 'number' && this.puzzle[k] === x) ||
            (Array.isArray(this.puzzle[k]) && this.puzzle[k].includes(x))
          );
          const presentY = yellow.some(k =>
            (typeof this.puzzle[k] === 'number' && this.puzzle[k] === y) ||
            (Array.isArray(this.puzzle[k]) && this.puzzle[k].includes(y))
          );
          // Must have exactly one present
          if (presentX === presentY) continue;
          const eliminateCand = presentX ? x : y;
          // Gather external eliminations: cells seen by both p1 and p2, not in pts
          const elim = [];
          for (let m = 0; m < 81; m++) {
            if (Array.isArray(this.puzzle[m]) && this.puzzle[m].includes(eliminateCand) && !pts.includes(m) &&
              this.sees(p1, m) && this.sees(p2, m)) {
              elim.push(m);
            }
          }
          if (elim.length > 0) {
            // Apply eliminations
            elim.forEach(m => {
              this.puzzle[m] = this.puzzle[m].filter(n => n !== eliminateCand);
            });
            // Mark involved: both pair cells and eliminated cells
            this.markInvolved(p1, p2, ...yellow);
            return true;
          }
        }
      }
    }
    return false;
  }

  // Simple Coloring: build two-color chains on strong links to eliminate a candidate
  applySimpleColoring() {
    // For each candidate value
    for (let num = 1; num <= 9; num++) {
      // 1) Gather all bivalue cells that contain num
      const nodes = [];
      for (let i = 0; i < 81; i++) {
        if (Array.isArray(this.puzzle[i]) && this.puzzle[i].length === 2 && this.puzzle[i].includes(num)) {
          nodes.push(i);
        }
      }
      if (nodes.length < 2) continue;

      // 2) Build strong-link graph: edges between nodes that share a unit and are the only two with num in that unit
      const adj = {};
      nodes.forEach(i => adj[i] = []);
      // use this.sees instead of local sees
      // For each pair of nodes, check strong link
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          if (!this.sees(a, b)) continue;
          // Determine unit type and count of num in that unit
          let count = 0;
          if (Math.floor(a / 9) === Math.floor(b / 9)) {
            // row
            const r = Math.floor(a / 9);
            for (let c = 0; c < 9; c++) if (Array.isArray(this.puzzle[r * 9 + c]) && this.puzzle[r * 9 + c].includes(num)) count++;
          } else if (a % 9 === b % 9) {
            // column
            const c = a % 9;
            for (let r = 0; r < 9; r++) if (Array.isArray(this.puzzle[r * 9 + c]) && this.puzzle[r * 9 + c].includes(num)) count++;
          } else if (Math.floor(a / 27) === Math.floor(b / 27) && Math.floor((a % 9) / 3) === Math.floor((b % 9) / 3)) {
            // box
            const br = 3 * Math.floor(Math.floor(a / 9) / 3), bc = 3 * Math.floor((a % 9) / 3);
            for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
              const idx = (br + dr) * 9 + (bc + dc);
              if (Array.isArray(this.puzzle[idx]) && this.puzzle[idx].includes(num)) count++;
            }
          }
          if (count === 2) {
            adj[a].push(b);
            adj[b].push(a);
          }
        }
      }

      // 3) For each connected component, attempt 2-coloring
      const visitedComp = new Set();
      for (const start of nodes) {
        if (visitedComp.has(start)) continue;
        // BFS to collect component
        const comp = [];
        const queue = [start];
        visitedComp.add(start);
        while (queue.length) {
          const u = queue.shift(); comp.push(u);
          adj[u].forEach(v => {
            if (!visitedComp.has(v)) { visitedComp.add(v); queue.push(v); }
          });
        }
        if (comp.length < 2) continue;

        // 4) 2-color this component
        const color = {};
        const cQueue = [comp[0]];
        color[comp[0]] = 0;
        while (cQueue.length) {
          const u = cQueue.shift();
          adj[u].forEach(v => {
            if (color[v] === undefined) {
              color[v] = 1 - color[u];
              cQueue.push(v);
            }
          });
        }

        // 5) Find eliminations: any cell (not in comp) that sees a 0-colored and a 1-colored node
        const elim = [];
        for (let m = 0; m < 81; m++) {
          if (!Array.isArray(this.puzzle[m]) || !this.puzzle[m].includes(num)) continue;
          if (comp.includes(m)) continue;
          let sees0 = false, sees1 = false;
          comp.forEach(u => {
            if (this.sees(u, m)) {
              if (color[u] === 0) sees0 = true;
              if (color[u] === 1) sees1 = true;
            }
          });
          if (sees0 && sees1) elim.push(m);
        }
        if (elim.length > 0) {
          // apply all eliminations and mark involved
          elim.forEach(m => {
            this.puzzle[m] = this.puzzle[m].filter(n => n !== num);
          });
          this.markInvolved(...comp);
          return true;
        }
      }
    }
    return false;
  }

  // Swordfish strategy: eliminate candidates via 3x3 row/column patterns
  applySwordfish() {
    let changed = false;
    // Row-based Swordfish
    for (let num = 1; num <= 9; num++) {
      const rowPositions = [];
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++) {
          const idx = r * 9 + c;
          if (Array.isArray(this.puzzle[idx]) && this.puzzle[idx].includes(num)) {
            cols.push(c);
          }
        }
        if (cols.length >= 2 && cols.length <= 3) rowPositions.push({ r, cols });
      }
      // check all triples of rows
      for (let i = 0; i < rowPositions.length; i++) {
        for (let j = i + 1; j < rowPositions.length; j++) {
          for (let k = j + 1; k < rowPositions.length; k++) {
            const a = rowPositions[i], b = rowPositions[j], c = rowPositions[k];
            const allCols = Array.from(new Set([...a.cols, ...b.cols, ...c.cols]));
            if (allCols.length === 3) {
              // eliminate from other rows in these 3 columns
              for (let rr = 0; rr < 9; rr++) {
                if ([a.r, b.r, c.r].includes(rr)) continue;
                for (const col of allCols) {
                  const idx2 = rr * 9 + col;
                  if (Array.isArray(this.puzzle[idx2]) && this.puzzle[idx2].includes(num)) {
                    this.puzzle[idx2] = this.puzzle[idx2].filter(n => n !== num);
                    changed = true;
                    this.markInvolved(a.r * 9 + a.cols[0], a.r * 9 + a.cols[1], b.r * 9 + b.cols[0], b.r * 9 + b.cols[1], c.r * 9 + c.cols[0], c.r * 9 + c.cols[1]);
                  }
                }
              }
            }
          }
        }
      }
    }
    // Column-based Swordfish
    for (let num = 1; num <= 9; num++) {
      const colPositions = [];
      for (let c = 0; c < 9; c++) {
        const rows = [];
        for (let r = 0; r < 9; r++) {
          const idx = r * 9 + c;
          if (Array.isArray(this.puzzle[idx]) && this.puzzle[idx].includes(num)) {
            rows.push(r);
          }
        }
        if (rows.length >= 2 && rows.length <= 3) colPositions.push({ c, rows });
      }
      // check all triples of columns
      for (let i = 0; i < colPositions.length; i++) {
        for (let j = i + 1; j < colPositions.length; j++) {
          for (let k = j + 1; k < colPositions.length; k++) {
            const a = colPositions[i], b = colPositions[j], c = colPositions[k];
            const allRows = Array.from(new Set([...a.rows, ...b.rows, ...c.rows]));
            if (allRows.length === 3) {
              // eliminate from other columns in these 3 rows
              for (let cc = 0; cc < 9; cc++) {
                if ([a.c, b.c, c.c].includes(cc)) continue;
                for (const row of allRows) {
                  const idx2 = row * 9 + cc;
                  if (Array.isArray(this.puzzle[idx2]) && this.puzzle[idx2].includes(num)) {
                    this.puzzle[idx2] = this.puzzle[idx2].filter(n => n !== num);
                    changed = true;
                  }
                }
              }
            }
          }
        }
      }
    }
    return changed;
  }

  // Rectangle Elimination strategy: eliminate candidates in a rectangle pattern
  applyRectangleElimination() {
    for (let num = 1; num <= 9; num++) {
      for (let r = 0; r < 9; r++) {
        const rowCells = [];
        for (let c = 0; c < 9; c++) {
          const idx = r * 9 + c;
          if (Array.isArray(this.puzzle[idx]) && this.puzzle[idx].includes(num)) rowCells.push(idx);
        }
        if (rowCells.length !== 2) continue;
        const b1 = 3 * Math.floor(Math.floor(rowCells[0] / 9) / 3) + Math.floor((rowCells[0] % 9) / 3);
        const b2 = 3 * Math.floor(Math.floor(rowCells[1] / 9) / 3) + Math.floor((rowCells[1] % 9) / 3);
        if (b1 === b2) continue;
        // 3. for each hinge
        for (const hinge of rowCells) {
          const other = rowCells.find(i => i !== hinge);
          const hc = hinge % 9;
          for (let rr = 0; rr < 9; rr++) {
            if (rr === r) continue;
            const wing = rr * 9 + hc;
            if (!Array.isArray(this.puzzle[wing]) || !this.puzzle[wing].includes(num)) continue;
            const bWing = 3 * Math.floor(Math.floor(wing / 9) / 3) + Math.floor((wing % 9) / 3);
            if (bWing === b1 || bWing === b2) continue;
            const oc = other % 9;
            const br0 = Math.floor(rr / 3) * 3;
            const bc0 = Math.floor(oc / 3) * 3;
            const boxPos = [];
            for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
              const idxB = (br0 + dr) * 9 + (bc0 + dc);
              if (Array.isArray(this.puzzle[idxB]) && this.puzzle[idxB].includes(num)) boxPos.push(idxB);
            }
            if (boxPos.length === 0) continue;
            const coversAll = boxPos.every(idxB => {
              const rrB = Math.floor(idxB / 9), ccB = idxB % 9;
              return rrB === rr || ccB === oc;
            });
            if (!coversAll) continue;
            this.puzzle[wing] = this.puzzle[wing].filter(n => n !== num);
            this.markInvolved(hinge, other, wing);
            return true;
          }
        }
      }
      for (let c = 0; c < 9; c++) {
        const colCells = [];
        for (let r = 0; r < 9; r++) {
          const idx = r * 9 + c;
          if (Array.isArray(this.puzzle[idx]) && this.puzzle[idx].includes(num)) colCells.push(idx);
        }
        if (colCells.length !== 2) continue;
        const b1 = 3 * Math.floor(Math.floor(colCells[0] / 9) / 3) + Math.floor((colCells[0] % 9) / 3);
        const b2 = 3 * Math.floor(Math.floor(colCells[1] / 9) / 3) + Math.floor((colCells[1] % 9) / 3);
        if (b1 === b2) continue;
        for (const hinge of colCells) {
          const other = colCells.find(i => i !== hinge);
          const hr = Math.floor(hinge / 9);
          for (let cc = 0; cc < 9; cc++) {
            if (cc === c) continue;
            const wing = hr * 9 + cc;
            if (!Array.isArray(this.puzzle[wing]) || !this.puzzle[wing].includes(num)) continue;
            const bWing = 3 * Math.floor(Math.floor(wing / 9) / 3) + Math.floor((wing % 9) / 3);
            if (bWing === b1 || bWing === b2) continue;
            const or0 = Math.floor(other / 9);
            const br0 = Math.floor(or0 / 3) * 3;
            const bc0 = Math.floor(cc / 3) * 3;
            const boxPos = [];
            for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
              const idxB = (br0 + dr) * 9 + (bc0 + dc);
              if (Array.isArray(this.puzzle[idxB]) && this.puzzle[idxB].includes(num)) boxPos.push(idxB);
            }
            if (boxPos.length === 0) continue;
            const coversAll = boxPos.every(idxB => {
              const rrB = Math.floor(idxB / 9), ccB = idxB % 9;
              return ccB === cc || rrB === or0;
            });
            if (!coversAll) continue;
            this.puzzle[wing] = this.puzzle[wing].filter(n => n !== num);
            this.markInvolved(hinge, other, wing);
            return true;
          }
        }
      }
    }
    return false;
  }

  // XYZ-Wing strategy: eliminate a candidate via pivot-with-three-candidates and two bivalue wings
  applyXYZWing() {
    // For each pivot cell with exactly three candidates
    for (let pivot = 0; pivot < 81; pivot++) {
      const cell = this.puzzle[pivot];
      if (!Array.isArray(cell) || cell.length !== 3) continue;
      const [c1, c2, c3] = cell;
      // For each choice of removal candidate z among the three
      for (const z of [c1, c2, c3]) {
        // The other two are wing values
        const others = [c1, c2, c3].filter(n => n !== z);
        const [x, y] = others;
        // Find wing cells: bivalue containing [x,z] and [y,z]
        const wingX = [], wingY = [];
        for (let w = 0; w < 81; w++) {
          const cw = this.puzzle[w];
          if (!Array.isArray(cw) || cw.length !== 2) continue;
          if (!this.sees(pivot, w)) continue;
          // wing for x-z
          if (cw.includes(x) && cw.includes(z) && !cw.includes(y)) wingX.push(w);
          // wing for y-z
          if (cw.includes(y) && cw.includes(z) && !cw.includes(x)) wingY.push(w);
        }
        // Try each wing pair
        for (const w1 of wingX) {
          for (const w2 of wingY) {
            if (w1 === w2) continue;
            if (this.sees(w1, w2)) continue;
            // Collect elimination targets: any cell that sees pivot, w1, and w2 and contains z
            const targets = [];
            for (let m = 0; m < 81; m++) {
              const cm = this.puzzle[m];
              if (!Array.isArray(cm) || !cm.includes(z)) continue;
              if (this.sees(m, pivot) && this.sees(m, w1) && this.sees(m, w2)) {
                targets.push(m);
              }
            }
            // Filter out pivot and wing cells: only eliminate from external cells
            const elim = targets.filter(m => m !== pivot && m !== w1 && m !== w2);
            if (elim.length > 0) {
              // Apply elimination
              elim.forEach(m => {
                this.puzzle[m] = this.puzzle[m].filter(n => n !== z);
              });
              // Mark involved: pivot, both wings, and all eliminated targets
              this.markInvolved(pivot, w1, w2);
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // Bi-Value Universal Grave (BUG) strategy: eliminate candidates from the sole tri-value cell using deadly pattern check
  applyBUG() {
    // Identify the BUG cell: exactly one cell with 3 candidates, all others bivalue
    let bugIdx = -1;
    for (let i = 0; i < 81; i++) {
      const cell = this.puzzle[i];
      if (Array.isArray(cell)) {
        if (cell.length === 3) {
          if (bugIdx !== -1) return false;
          bugIdx = i;
        } else if (cell.length !== 2) {
          return false;
        }
      }
    }
    if (bugIdx < 0) return false;

    // Precompute the three units for bugIdx
    const row = Math.floor(bugIdx / 9), col = bugIdx % 9;
    const rowUnit = Array.from({ length: 9 }, (_, c) => row * 9 + c);
    const colUnit = Array.from({ length: 9 }, (_, r) => r * 9 + col);
    const br = 3 * Math.floor(row / 3), bc = 3 * Math.floor(col / 3);
    const boxUnit = [];
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
      boxUnit.push((br + dr) * 9 + (bc + dc));
    }
    const units = [rowUnit, colUnit, boxUnit];

    // Try each candidate in the BUG cell
    const original = this.puzzle[bugIdx].slice();
    for (const cand of original) {
      // Simulate removing cand from BUG cell
      const sim = this.puzzle.map(c => (Array.isArray(c) ? c.slice() : c));
      sim[bugIdx] = sim[bugIdx].filter(n => n !== cand);

      // Check deadly pattern: in each of the three units, every candidate appears exactly twice
      let deadly = true;
      for (const unit of units) {
        const freq = {};
        for (const idx of unit) {
          const cc = sim[idx];
          if (Array.isArray(cc)) {
            cc.forEach(v => freq[v] = (freq[v] || 0) + 1);
          }
        }
        // All present candidates must occur exactly twice
        for (const v in freq) {
          if (freq[v] !== 2) {
            deadly = false;
            break;
          }
        }
        if (!deadly) break;
      }
      if (deadly) {
        // cand leads to deadly BUG pattern if removed, so cand must be the value
        this.setCell(bugIdx, cand);
        this.markInvolved(bugIdx);
        return true;
      }
    }
    return false;
  }

  // XY-Chain strategy: find a true cycle of bivalue cells ending in the same pivot candidate
  applyXYChain() {
    // 1) Gather all bivalue cells
    const bivals = [];
    for (let i = 0; i < 81; i++) {
      if (Array.isArray(this.puzzle[i]) && this.puzzle[i].length === 2) bivals.push(i);
    }
    if (bivals.length < 3) return false;

    // 3) For each pivot candidate z
    for (let z = 1; z <= 9; z++) {
      // potential chain endpoints (contain z)
      const pivots = bivals.filter(i => this.puzzle[i].includes(z));
      if (pivots.length < 2) continue;
      // try each ordered (start,end)
      for (const start of pivots) {
        for (const end of pivots) {
          if (start === end) continue;
          // path search: start must connect to end via alternating links
          // first link uses the non-z candidate from start
          const [a, b] = this.puzzle[start];
          const first = (a === z ? b : a);
          // DFS stack: { idx, lastVal, path }
          const stack = [{ idx: start, lastVal: first, path: [start] }];
          const visited = new Set([`${start},${first}`]);
          while (stack.length) {
            const { idx, lastVal, path } = stack.pop();
            // try neighbors
            for (const next of bivals) {
              if (path.includes(next)) continue;
              if (!this.sees(idx, next)) continue;
              const [u, v] = this.puzzle[next];
              // must share lastVal
              if (![u, v].includes(lastVal)) continue;
              // compute candidate for next link
              const nxtVal = (u === lastVal ? v : u);
              // if next==end and nxtVal===z and path.length >= 3, bingo
              if (next === end && nxtVal === z && path.length >= 3) {
                const foundPath = path.concat(end);
                // collect all potential eliminations (cells seeing both ends)
                const eliminationCandidates = [];
                for (let m = 0; m < 81; m++) {
                  if (!Array.isArray(this.puzzle[m]) || !this.puzzle[m].includes(z)) continue;
                  if (this.sees(start, m) && this.sees(end, m)) {
                    eliminationCandidates.push(m);
                  }
                }
                // filter out any chain cells
                const actualElim = eliminationCandidates.filter(m => !foundPath.includes(m));
                if (actualElim.length > 0) {
                  // apply all eliminations outside the chain
                  actualElim.forEach(m => {
                    this.puzzle[m] = this.puzzle[m].filter(x => x !== z);
                  });
                  this.markInvolved(...foundPath);
                  return true;
                }
                // if no external elimination, abandon this chain
                continue;
              }
              // else continue search
              const key = `${next},${nxtVal}`;
              if (visited.has(key)) continue;
              visited.add(key);
              stack.push({ idx: next, lastVal: nxtVal, path: path.concat(next) });
            }
          }
        }
      }
    }
    return false;
  }
}

module.exports = SudokuSolver;