import { Techniques } from './../components/solver/Techniques';
// pages/SolverPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SudokuGrid from '../components/SudokuGrid';

const SolverPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const puzzleParam = params.get('puzzle');
  // State hooks for input, puzzle, techniques, and difficulty
  const [rawInput, setRawInput] = useState('');
  const [puzzle, setPuzzle] = useState(Array(81).fill([]));
  const [origPuzzle, setOrigPuzzle] = useState(Array(81).fill([]));
  const [techniques, setTechniques] = useState([]);
  const [difficulty, setDifficulty] = useState(null);
  const listRef = useRef(null);
  const [stepIndex, setStepIndex] = useState(-1);
  const [removedCandidates, setRemovedCandidates] = useState([]);
  const [addition, setAddition] = useState(Array(81).fill(0));
  const [involvedCells, setInvolvedCells] = useState(Array(81).fill(0));

  // If a puzzle string is provided via query, load it on mount
  useEffect(() => {
    if (puzzleParam && puzzleParam.length === 81) {
      // Parse the 81-character string into our internal format
      const arr = puzzleParam.split('').map(ch => (ch === '.' || ch === '0') ? [] : parseInt(ch, 10));
      setPuzzle(arr);
      setOrigPuzzle(arr);
      setTechniques([]);
      setDifficulty(null);
      setStepIndex(-1);
      setRemovedCandidates([]);
      setAddition(Array(81).fill(0));
      setInvolvedCells(Array(81).fill(0));
      // Also pre-fill the raw input textbox
      setRawInput(puzzleParam);
      console.log('Loaded puzzle from query:', arr);
    }
  }, [puzzleParam]);

  useEffect(() => {
    // build a fresh addition mask for this step
    const additionMask = Array(81).fill(0);
    if (stepIndex >= 0 && techniques.length > 0) {
      const newPuzzle = techniques[stepIndex].puzzle;
      const oldPuzzle = stepIndex === 0 ? origPuzzle : techniques[stepIndex - 1].puzzle;
      // Determine removals by diffing candidate arrays
      const removals = [];
      for (let i = 0; i < 81; i++) {
        const oldCell = oldPuzzle[i];
        const newCell = newPuzzle[i];
        if (Array.isArray(oldCell) && Array.isArray(newCell)) {
          oldCell.forEach(val => {
            if (!newCell.includes(val)) removals.push({ index: i, value: val });
          });
        } else if (Array.isArray(oldCell) && typeof newCell === 'number') {
          // mark this cell as newly set
          additionMask[i] = 1;
        }
      }
      // apply all removals and additions at once
      setRemovedCandidates(removals);
      setAddition(additionMask);
      setPuzzle(newPuzzle);
      // highlight the cells involved in this technique
      setInvolvedCells(techniques[stepIndex].involved || Array(81).fill(0));

      // puzzle state to log as a string, the arrays should be represented as arrays "[a,b,c]"
      const puzzleString = newPuzzle.map(cell => (Array.isArray(cell) ? `[${cell.join(',')}]` : cell)).join('');
      console.log(`Puzzle state: ${puzzleString}`);
    }
  }, [stepIndex, techniques, origPuzzle]);

  useEffect(() => {
    if (listRef.current && stepIndex >= 0) {
      const items = listRef.current.children;
      if (items[stepIndex]) {
        items[stepIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [stepIndex]);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Sudoku Solver</h2>
      <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column' }}>
        <div>Paste puzzle string (81 chars, use . for blanks): </div>
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          <input
            type="text"
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            style={{ width: '500px' }}
          />
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
            onClick={() => {
              if (rawInput.length === 81) {
                const arr = rawInput.split('').map(ch => (ch === '.' ? [] : parseInt(ch, 10)));
                setPuzzle(arr);
                setOrigPuzzle(arr);
                setStepIndex(-1);
                setRemovedCandidates([]);
                setTechniques([]);
                setDifficulty(null);
                console.log('Puzzle:', arr);
                // update URL to include the puzzle query
                navigate(`?puzzle=${rawInput}`);
              } else {
                alert('Input must be exactly 81 characters');
              }
            }}
          >Load Puzzle</button>
        </div>
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'stretch' }}>
        {/* Left: the grid */}
        <div style={{ flex: 1 }}>
          <SudokuGrid
            puzzle={puzzle}
            originalPuzzle={origPuzzle}
            onChange={(i, val) => {
              const copy = [...puzzle]; copy[i] = val; setPuzzle(copy);
            }}
            highlightedRemovals={removedCandidates}
            highlightedAddition={addition}
            highlightedTechCells={involvedCells}
          />

          <div style={{ marginTop: '1rem' }}>
            <button
              className="px-6 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
              onClick={async () => {
                try {
                  const res = await axios.post('http://localhost:3001/api/sudoku/solve', { puzzle });
                  setTechniques(res.data.techniques);
                  setDifficulty(res.data.difficulty);
                  setStepIndex(0);
                } catch (err) {
                  console.error(err);
                  alert('Solve failed');
                }
              }}
            >Solve</button>
          </div>

          {techniques.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <button 
                className="px-4 py-2 bg-gray-500 text-white rounded mr-2 hover:bg-gray-600 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={() => setStepIndex(i => Math.max(i - 1, 0))} 
                disabled={stepIndex <= 0}
              >
                Previous
              </button>
              <button 
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors duration-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                onClick={() => setStepIndex(i => Math.min(i + 1, techniques.length - 1))} 
                disabled={stepIndex >= techniques.length - 1}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right: the techniques panel */}
        <Techniques   difficulty={difficulty} listRef={listRef} techniques={techniques} setStepIndex={setStepIndex} stepIndex={stepIndex}  />
      </div>
    </div>
  );
};

export default SolverPage;