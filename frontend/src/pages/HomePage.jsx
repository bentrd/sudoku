// frontend/src/pages/HomePage.jsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SudokuGrid from '../components/SudokuGrid';
import SuccessModal from '../components/SuccessModal';
import axios from 'axios';
import difficulties from '../data/difficulties.json';

const HomePage = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const puzzleParam = params.get('puzzle') || '';

    // “puzzle” and “originalPuzzle” are both arrays of length 81.
    //   – puzzle: initial digits and zeros for blanks (server does *not* include candidates here).
    //   – originalPuzzle: same alignment; if originalPuzzle[i] ∈ 1..9, that cell is “locked” (given).
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

    const navigate = useNavigate();

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
            //   res.data.puzzle   = an array of length 81 (numbers 0..9, where 0 = empty)
            //   res.data.solution = an array of length 81 (numbers 1..9)
            //   res.data.rating   = difficulty score
            //   res.data.category = category name (e.g. “Easy”)

            const rawPuzzle = res.data.puzzle.map(n => Number(n));
            const rawSolution = res.data.solution.map(n => Number(n));
            const id = res.data.id;

            setPuzzle(rawPuzzle);
            // “originalPuzzle” is exactly the givens; all nonzero entries are locked in place
            setOriginalPuzzle(rawPuzzle);

            setSolution(rawSolution);
            setRating(res.data.rating);
            setCategory(res.data.category);
            setHasCompleted(false);
            setShowModal(false);
            navigate(`?puzzle=${id}`, { replace: true });

            // Build a “string” where dots represent empties (for debug / copy)
            //const str = rawPuzzle.map(v => (v === 0 ? '.' : v)).join('');
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
            setDots(prev => (prev.length < 3 ? prev + '.' : ''));
        }, 500);
        return () => clearInterval(interval);
    }, [isGenerating]);

    // Callback passed down to SudokuGrid; receives a flat array of 81 digits (0 if empty)
    const handleBoardChange = digits => {
        if (!solution) return console.error('No solution available yet!');
        // If not all filled or already completed once, do nothing
        const allFilled = digits.every(v => v.digit >= 1 && v.digit <= 9);
        if (!allFilled || hasCompleted) return;

        // Compare each entry with solution
        const correct = digits.every((val, i) => val.digit === solution[i]);
        if (!correct) return;
        setShowModal(true);
        setHasCompleted(true);
    };

    return (
        <div className="h-[calc(100vh-4rem)] min-w-screen flex flex-col items-center p-4">
            {/* Header / Controls */}
            {!puzzleParam && (
                <div className="w-full max-w-4xl">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-6 py-4 flex flex-col md:items-center space-y-4 md:space-y-0">
                        <div className="flex flex-col md:flex-row md:items-center md:space-x-4">
                            <div className='flex items-center space-x-2 rounded-full bg-gray-100 pl-4 shadow-sm'>
                                <label className="text-gray-700 font-medium">Difficulty:</label>
                                <div className="relative inline-block">
                                    <select
                                        value={difficulty}
                                        onChange={e => setDifficulty(e.target.value)}
                                        className="
                              appearance-none
                              bg-white
                              text-gray-700
                              text-sm
                              font-medium
                              px-4
                              py-2
                              rounded-full
                              border border-gray-300
                              focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                              cursor-pointer
                              pr-8 
                            "
                                    >
                                        <option value="Random">Random</option>
                                        {difficulties.map(diff => (
                                            <option key={diff.name} value={diff.name}>
                                                {diff.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-500">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => fetchPuzzle(true)}
                                disabled={isGenerating}
                                className={`mt-3 md:mt-0 px-4 py-2 font-semibold rounded-full transition-colors ${isGenerating
                                    ? 'bg-gray-300 text-gray-700 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                {isGenerating ? `Generating...` : 'Generate New Puzzle'}
                            </button>
                        </div>
                        <br className="w-full md:w-auto border-gray-200 my-2 md:my-0"></br>

                        <div className="text-gray-600 font-medium text-center md:text-right">
                            Choose a category and generate a puzzle
                        </div>
                    </div>
                </div>
            )}

            {/* Sudoku Grid */}
            <div className="w-full max-w-4xl mt-6">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                    <p className="text-gray-600">
                        {rating ? `Rating: ${rating}${category ? ` (${category})` : ''}` : 'No rating available'}
                    </p>
                    <SudokuGrid
                        initialPuzzle={puzzle}
                        originalPuzzle={originalPuzzle}
                        disabled={isGenerating}
                        onBoardChange={handleBoardChange}
                    />
                </div>
            </div>

            {/* Success Modal */}
            <SuccessModal isOpen={showModal} onClose={() => setShowModal(false)} />
        </div>
    );
};

export default HomePage;