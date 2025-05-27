// pages/HomePage.jsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import SudokuGrid from '../components/SudokuGrid';
import Switch from '../components/Switch';
import axios from 'axios';
import difficulties from '../data/difficulties.json';

const HomePage = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const puzzleParam = params.get('puzzle');

    const [puzzle, setPuzzle] = useState(Array(81).fill([]));
    const [originalPuzzle, setOriginalPuzzle] = useState(Array(81).fill([]));
    const [difficulty, setDifficulty] = useState('Easy');
    const [rating, setRating] = useState(null);
    const [category, setCategory] = useState(null);
    // store the true solution from the server
    const [solution, setSolution] = useState(null);
    // prevent repeat popups
    const [hasCompleted, setHasCompleted] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [dots, setDots] = useState('');
    const [puzzleString, setPuzzleString] = useState('');
    const [mode, setMode] = useState('number');

    const fetchPuzzle = async (isGenerate = false) => {
        try {
            if (isGenerate) {
                // clear the grid and disable inputs
                setPuzzle(Array(81).fill([]));
                setOriginalPuzzle(Array(81).fill([]));
                setSolution(null);
                setHasCompleted(false);
                setIsGenerating(true);
            }
            // If a puzzle query string is provided, load that puzzle; otherwise generate by difficulty
            const url = !isGenerate && puzzleParam
                ? `http://localhost:3001/api/sudoku?puzzle=${puzzleParam}`
                : `http://localhost:3001/api/sudoku?difficulty=${difficulty}`;
            // API returns puzzle and solution arrays
            const res = await axios.get(url);
            console.log('Puzzle response:', res);
            if (!Array.isArray(res.data.puzzle)) throw new Error('Invalid puzzle format');
            const parsed = res.data.puzzle.map(cell => Array.isArray(cell) ? cell : parseInt(cell, 10));
            // server returns solution as flat array of numbers or strings
            const sol = res.data.solution.map(n => Number(n));

            setPuzzle(parsed);
            setOriginalPuzzle(parsed);
            setRating(res.data.rating);
            setCategory(res.data.category);
            setSolution(sol);
            setHasCompleted(false);
            const str = parsed.map(cell => (Array.isArray(cell) ? '.' : cell)).join('');
            setPuzzleString(str);
            console.log('Puzzle:', str);
        } catch (err) {
            console.error('Failed to fetch puzzle:', err);
        } finally {
            if (isGenerate) setIsGenerating(false);
        }
    };

    useEffect(() => {
        // If a puzzle is provided via query, load it; otherwise wait for user to generate
        if (puzzleParam) {
            fetchPuzzle(false);
        }
        // eslint-disable-next-line
    }, [puzzleParam]);
    // animate dots when generating
    useEffect(() => {
        if (!isGenerating) {
            setDots('');
            return;
        }
        const interval = setInterval(() => {
            setDots(d => (d.length < 3 ? d + '.' : ''));
        }, 500);
        return () => clearInterval(interval);
    }, [isGenerating]);

    const handleChange = async (index, value) => {
        if (mode === 'number') {
                axios.post('http://localhost:3001/api/sudoku/place', {
                    puzzle: puzzle.slice(),
                    cellIndex: index,
                    value: value,
                })
                .then(res => setPuzzle(res.data.puzzle))
                .catch(err => {console.error('Failed to place value:', err)}); 
        } else if (mode === 'candidate') {
            const newPuzzle = puzzle.map((cell, i) => {
                if (i === index) {
                    if (Array.isArray(cell)) {
                        // If the cell is already an array, toggle the candidate
                        return cell.includes(value) ? cell.filter(v => v !== value) : [...cell, value];
                    } else {
                        return;
                    }
                }
                return cell;
            });
            setPuzzle(newPuzzle);
        }
    };

    useEffect(() => {
        if (puzzleParam) {
            const str = puzzle.map(cell => (Array.isArray(cell) ? '.' : cell)).join('');
            setPuzzleString(str);
        }
    }
    , [puzzle, puzzleParam]);

    useEffect(() => {
        if (!solution) return;
        // check if all cells are filled with numbers 1-9
        const allFilled = puzzle.every(cell => typeof cell === 'number' && cell !== 0);
        if (!allFilled || hasCompleted) return;

        // compare user entries to solution
        const correct = puzzle.every((v, i) => v === solution[i]);
        if (correct) {
            window.alert('🎉 Congratulations! You solved it correctly!');
        } else {
            window.alert('❌ Some entries are incorrect. Keep trying!');
        }
        setHasCompleted(true);
    }, [puzzle, solution, hasCompleted]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', width: '100%', height: '100vh' }}>
            <h1>Sudoku Battle</h1>
            <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <label>Difficulty: </label>
                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                        <option key="Random" value="Random">Random</option>
                        {difficulties.map((diff) => (
                            <option key={diff.name} value={diff.name}>
                                {diff.name}
                            </option>
                        ))}
                    </select>
                    <button onClick={() => fetchPuzzle(true)} disabled={isGenerating}>
                        {isGenerating ? 'Generating…' : 'Generate New Puzzle'}
                    </button>
                </div>
                <div style={{ fontWeight: 'bold', marginTop: '1em' }}>
                    {isGenerating
                        ? `Creating a new puzzle${dots}`
                        : rating == null
                            ? 'Choose a category and generate a puzzle'
                            : `Rating: ${rating}${category ? ` (${category})` : ''}`}
                </div>
            </div>
            {/* Mode switch between entering numbers or toggling candidates */}
            <Switch mode={mode} onChange={setMode} />
            <SudokuGrid
                puzzle={puzzle}
                originalPuzzle={originalPuzzle}
                onChange={handleChange}
                mode={mode}
                disabled={isGenerating}
            />
            <div style={{ marginTop: '1rem', width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label htmlFor="puzzle-string">Puzzle String:</label>
                <input
                    id="puzzle-string"
                    type="text"
                    readOnly
                    value={puzzleString}
                    onClick={() => navigator.clipboard.writeText(puzzleString)}
                    style={{ flex: 1, cursor: 'pointer' }}
                    title="Click to copy to clipboard"
                />
                <button
                    onClick={() => window.open(`/solver?puzzle=${puzzleString}`, '_blank')}
                    style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
                >
                    Send to Solver
                </button>
            </div>
        </div>
    );
};

export default HomePage;
