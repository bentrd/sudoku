// frontend/src/pages/HomePage.jsx
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import SudokuGrid from '../components/SudokuGrid';
import SuccessModal from '../components/SuccessModal';
import axios from 'axios';
import difficulties from '../data/difficulties.json';

const HomePage = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const puzzleParam = params.get('puzzle') || '';

    // “puzzle” and “originalPuzzle” are both arrays of length 81.
    //  – puzzle: initial digits and zeros for blanks (server does *not* include candidates here).
    //  – originalPuzzle: same alignment; if originalPuzzle[i] ∈ 1..9, that cell is “locked” (given).
    const [puzzle, setPuzzle] = useState(Array(81).fill(0));
    const [originalPuzzle, setOriginalPuzzle] = useState(Array(81).fill(0));

    // The server’s “solution”: a flat array of length 81, number 1..9 in each entry
    const [solution, setSolution] = useState(null);

    // Once the user has correctly filled the last digit, showModal→true
    const [showModal, setShowModal] = useState(false);

    // Prevent re‐triggering once completed
    const [hasCompleted, setHasCompleted] = useState(false);

    // Difficulty selector (e.g. “Easy”, “Medium”…)
    const [difficulty, setDifficulty] = useState('Easy');
    const [rating, setRating] = useState(null);
    const [category, setCategory] = useState(null);

    // Loading state when generating a new puzzle
    const [isGenerating, setIsGenerating] = useState(false);
    const [dots, setDots] = useState('');

    // Keep a string version of the puzzle for sharing / solver link
    const [puzzleString, setPuzzleString] = useState('');

    // Fetch either the puzzle from URL or generate one by difficulty
    const fetchPuzzle = async (isGenerate = false) => {
        try {
            if (isGenerate) {
                // Clear grid as soon as user clicks “Generate”
                setPuzzle(Array(81).fill(0));
                setOriginalPuzzle(Array(81).fill(0));
                setSolution(null);
                setHasCompleted(false);
                setShowModal(false);
                setIsGenerating(true);
            }

            const url = puzzleParam
                ? `http://localhost:3001/api/sudoku/generate?puzzle=${puzzleParam}`
                : `http://localhost:3001/api/sudoku/generate?difficulty=${difficulty}`;

            const res = await axios.get(url);
            // Server returns:
            //  res.data.puzzle   = an array of length 81 (numbers 0..9, where 0 = empty)
            //  res.data.solution = an array of length 81 (numbers 1..9)
            //  res.data.rating   = difficulty score
            //  res.data.category = category name (e.g. “Easy”)

            const rawPuzzle = res.data.puzzle.map(n => Number(n));
            const rawSolution = res.data.solution.map(n => Number(n));

            setPuzzle(rawPuzzle);
            // “originalPuzzle” is exactly the givens; all nonzero entries are locked in place
            setOriginalPuzzle(rawPuzzle);

            setSolution(rawSolution);
            setRating(res.data.rating);
            setCategory(res.data.category);
            setHasCompleted(false);
            setShowModal(false);

            // Build a “string” where dots represent empties
            const str = rawPuzzle.map(v => (v === 0 ? '.' : v)).join('');
            setPuzzleString(str);
        } catch (err) {
            console.error('Failed to fetch puzzle:', err);
        } finally {
            if (isGenerate) setIsGenerating(false);
        }
    };

    // On first load: if there’s a ?puzzle=… query, immediately fetch it
    useEffect(() => {
        if (puzzleParam) {
            fetchPuzzle(false);
        }
        // eslint-disable-next-line
    }, [puzzleParam]);

    // Animate “…” while generating
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

    // Callback passed down to SudokuGrid; receives a flat array of 81 digits (0 if empty)
    const handleBoardChange = digits => {
        if (!solution) return console.error('No solution available yet!');
        console.log('Board changed:', digits);
        // If not all filled or already completed once, do nothing
        const allFilled = digits.every(v => v.digit >= 1 && v.digit <= 9);
        if (!allFilled || hasCompleted) return;

        // Compare each entry with solution
        const correct = digits.every((val, i) => val.digit === solution[i]);
        console.log('User completed the puzzle:', correct);
        if (correct) {
            setShowModal(true);
        }
        setHasCompleted(true);
    };

    return (
        <div className="flex flex-col items-center w-full min-h-screen min-w-screen p-4">
            <h1 className="text-3xl font-bold mb-4">Sudoku Battle</h1>

            <div className="mb-6 flex flex-col items-center space-y-2">
                <div className="flex items-center space-x-2">
                    <label className="font-medium">Difficulty:</label>
                    <select
                        value={difficulty}
                        onChange={e => setDifficulty(e.target.value)}
                        className="border border-gray-300 rounded px-2 py-1"
                    >
                        <option value="Random">Random</option>
                        {difficulties.map(diff => (
                            <option key={diff.name} value={diff.name}>
                                {diff.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={() => fetchPuzzle(true)}
                        disabled={isGenerating}
                        className={`ml-4 px-4 py-2 font-semibold rounded transition-colors ${isGenerating
                                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {isGenerating ? `Generating${dots}` : 'Generate New Puzzle'}
                    </button>
                </div>

                <div className="font-medium mt-2">
                    {isGenerating
                        ? `Creating a new puzzle${dots}`
                        : rating == null
                            ? 'Choose a category and generate a puzzle'
                            : `Rating: ${rating}${category ? ` (${category})` : ''}`}
                </div>
            </div>

            <SudokuGrid
                initialPuzzle={puzzle}
                originalPuzzle={originalPuzzle}
                disabled={isGenerating}
                onBoardChange={handleBoardChange}
            />

            {/* Debug */}
            <button onClick={() => setShowModal(true)} className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">
                Show win modal
            </button>

            {/* Show the modal if the puzzle is solved correctly */}
            <SuccessModal isOpen={showModal} onClose={() => setShowModal(false)} />
        </div>
    );
};

export default HomePage;