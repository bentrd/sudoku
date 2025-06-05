// pages/SolverPage.jsx
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import SolverGrid from '../components/SolverGrid';

const PuzzleInput = ({ rawInput, setRawInput, onLoadPuzzle }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <label className="block text-sm font-bold text-gray-700 mb-3">
        Puzzle Input
      </label>
      <p className="text-sm text-gray-500 mb-3">
        Paste puzzle string (81 characters, use . for empty cells)
      </p>
      <div className="flex gap-3">
        <input
          type="text"
          value={rawInput}
          onChange={e => setRawInput(e.target.value)}
          placeholder="Enter 81-character puzzle string..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-mono"
        />
        <button
          className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          onClick={() => {
            if (rawInput.length === 81) {
              onLoadPuzzle(rawInput);
            } else {
              alert('Input must be exactly 81 characters');
            }
          }}
        >
          Load Puzzle
        </button>
      </div>
    </div>
  );
};

const SolverControls = ({ techniques, stepIndex, setStepIndex }) => {
  return (
    <div className="mt-2 pt-4">
      <div className="flex gap-3">
        <button
          className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          onClick={() => setStepIndex(i => Math.max(i - 1, 0))}
          disabled={stepIndex <= 0 && techniques.length === 0}
        >
          Previous Step
        </button>
        <button
          className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          onClick={() => setStepIndex(i => Math.min(i + 1, techniques.length - 1))}
          disabled={stepIndex >= techniques.length - 1 && techniques.length > 0}
        >
          Next Step
        </button>
      </div>
    </div>
  );
};

const GridPanel = ({
  puzzle,
  origPuzzle,
  setPuzzle,
  removedCandidates,
  addition,
  involvedCells,
  techniques,
  stepIndex,
  setStepIndex
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <SolverGrid
        puzzle={puzzle}
        originalPuzzle={origPuzzle}
        onChange={(i, val) => {
          const copy = [...puzzle];
          copy[i] = val;
          setPuzzle(copy);
        }}
        highlightedRemovals={removedCandidates}
        highlightedAddition={addition}
        highlightedTechCells={involvedCells}
      />

      <SolverControls
        techniques={techniques}
        stepIndex={stepIndex}
        setStepIndex={setStepIndex}
      />
    </div>
  );
};

const TechniquesPanel = ({
  difficulty,
  listRef,
  techniques,
  setStepIndex,
  stepIndex
}) => {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <div className="w-64 flex flex-col max-h-[calc(100vh-420px)]">
        {!difficulty ? (
          <div className="text-gray-500 text-sm">
            No techniques available yet. Load a puzzle to see the solving steps.
          </div>
        ) : (
          <>
            <div className="pb-4 mb-4 border-b border-gray-200">
              <p className="mb-2">
                Difficulty Score: <span className="font-bold">{difficulty.score}</span>
              </p>
              <p className="mb-3">
                Category: <span className="font-bold">{difficulty.name}</span>
              </p>
              <h3 className="font-semibold underline">Techniques Used:</h3>
            </div>

            <ul ref={listRef} className="overflow-y-auto flex-1 border border-gray-300 rounded-lg">
              {techniques.map((technique, index) => (
                <li
                  key={index}
                  onClick={() => setStepIndex(index)}
                  className={`cursor-pointer p-2 transition-colors ${index === stepIndex
                      ? 'bg-[#c6fb8e] hover:bg-[#b9ea84]'
                      : `${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'} hover:bg-gray-200`
                    }`}
                >
                  {technique.name}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

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

  const initPuzzle = async (arr, id) => {
    setPuzzle(arr);
    console.log(puzzle);
    setOrigPuzzle(arr);
    setTechniques([]);
    setDifficulty(null);
    setStepIndex(-1);
    setRemovedCandidates([]);
    setAddition(Array(81).fill(0));
    setInvolvedCells(Array(81).fill(0));
    // Also update the raw input textbox
    setRawInput(arr.map(n => (Array.isArray(n) ? '.' : n)).join(''));
    // Update the URL query parameter
    navigate(`?puzzle=${id ? id : arr.map(n => (Array.isArray(n) ? '.' : n)).join('')}`, { replace: true });
    solvePuzzle(arr);
  };

  const getPuzzleFromDB = async (puzzleId) => {
    try {
      const response = await axios.get(`http://localhost:3001/api/sudoku/generate?puzzle=${puzzleId}`);
      if (response.data && response.data.puzzle) {
        let arr = response.data.puzzle;
        console.log('Loaded puzzle from DB:', arr);
        return arr.map(ch => (ch === 0) ? [] : parseInt(ch, 10));
      }
      alert('Puzzle not found');
      return null;
    } catch (error) {
      console.error('Error fetching puzzle:', error);
      alert('Failed to load puzzle');
      return null;
    }
  };

  const solvePuzzle = async (arr) => {
    console.log('Solving puzzle:', arr);
    try {
      const response = await axios.post('http://localhost:3001/api/sudoku/solve', { puzzle: arr });
      if (response.data) {
        setTechniques(response.data.techniques);
        setDifficulty(response.data.difficulty);
        setStepIndex(0); // start at the first step
      } else {
        alert('Failed to solve puzzle');
      }
    } catch (error) {
      console.error('Error solving puzzle:', error);
      alert('Failed to solve puzzle');
    }
  };

  const handleLoadPuzzle = async (puzzleParam) => {
    if (!puzzleParam) return;
    let arr = null;
    let id = null;

    // If length is not 81, assume it's a numeric game ID.
    if (puzzleParam.length !== 81) {
      if (/^\d+$/.test(puzzleParam)) {
        id = parseInt(puzzleParam, 10);
        arr = await getPuzzleFromDB(id);
      } else {
        alert('Invalid puzzle parameter');
        return;
      }
    } else {
      // Direct puzzle string of length 81
      arr = puzzleParam.split('').map(ch => (ch === '.' || ch === '0') ? [] : parseInt(ch, 10));
    }

    // If we successfully obtained an array, initialize it
    if (arr) {
      initPuzzle(arr, id);
    }
  };

  useLayoutEffect(() => {
    if (puzzleParam) {
      handleLoadPuzzle(puzzleParam);
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
    <div className="min-w-screen">
      <div className="max-w-fit mx-auto max-h-screen">
        <div className="grid grid-cols-1 gap-6 mt-4">
          {/* Input Section */}
          <PuzzleInput
            rawInput={rawInput}
            setRawInput={setRawInput}
            onLoadPuzzle={handleLoadPuzzle}
          />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
            {/* Grid Panel */}
            <GridPanel
              puzzle={puzzle}
              origPuzzle={origPuzzle}
              setPuzzle={setPuzzle}
              removedCandidates={removedCandidates}
              addition={addition}
              involvedCells={involvedCells}
              techniques={techniques}
              stepIndex={stepIndex}
              setStepIndex={setStepIndex}
            />

            {/* Techniques Panel */}
            <TechniquesPanel
              difficulty={difficulty}
              listRef={listRef}
              techniques={techniques}
              setStepIndex={setStepIndex}
              stepIndex={stepIndex}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolverPage;