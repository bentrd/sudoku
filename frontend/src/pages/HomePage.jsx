import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import SudokuGrid from '../components/SudokuGrid';
import axios from 'axios';
import difficulties from '../data/difficulties.json';

const HomePage = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const puzzleParam = params.get('puzzle');

    const [puzzle, setPuzzle] = useState(Array(81).fill(0));
    const [originalPuzzle, setOriginalPuzzle] = useState(Array(81).fill(0));
    const [difficulty, setDifficulty] = useState('Easy');
    const [rating, setRating] = useState(null);
    const [category, setCategory] = useState(null);
    // store the true solution from the server
    const [solution, setSolution] = useState(null);
    // prevent repeat popups
    const [hasCompleted, setHasCompleted] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [dots, setDots] = useState('');

    const fetchPuzzle = async (isGenerate = false) => {
        try {
            if (isGenerate) {
                // clear the grid and disable inputs
                setPuzzle(Array(81).fill(0));
                setOriginalPuzzle(Array(81).fill(0));
                setSolution(null);
                setHasCompleted(false);
                setIsGenerating(true);
            }

            // If a puzzle query string is provided, load that puzzle; otherwise generate by difficulty
            const url = !isGenerate && puzzleParam
                ? `http://localhost:3001/api/sudoku/generate?puzzle=${puzzleParam}`
                : `http://localhost:3001/api/sudoku/generate?difficulty=${difficulty}`;

            // API returns puzzle and solution arrays
            const res = await axios.get(url);

            if (!Array.isArray(res.data.puzzle)) throw new Error('Invalid puzzle format');

            // Server now returns flat 0–9 for each cell (0=empty)
            const serverPuzzle = res.data.puzzle.map(n => Number(n) || 0);
            const serverSolution = res.data.solution.map(n => Number(n) || 0);

            // originalPuzzle: mark givens (anything >0) as locked
            setOriginalPuzzle(serverPuzzle);
            setPuzzle(serverPuzzle);

            setRating(res.data.rating);
            setCategory(res.data.category);
            setSolution(serverSolution);
            setHasCompleted(false);

            // Build a string for copying
            const str = serverPuzzle.map(n => (n === 0 ? '.' : n)).join('');
            setPuzzleString(str);
            console.log('Puzzle loaded:', str);
        } catch (err) {
            console.error('Failed to fetch puzzle:', err);
        } finally {
            if (isGenerate) setIsGenerating(false);
        }
    };

    useEffect(() => {
        // If a puzzle is provided via query, load it once; otherwise wait for user to click “Generate”
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

    // Check for completion whenever puzzle updates
    useEffect(() => {
        if (!solution) return;
        const allFilled = puzzle.every(cell => typeof cell === 'number' && cell !== 0);
        if (!allFilled || hasCompleted) return;

        const correct = puzzle.every((v, i) => v === solution[i]);
        if (correct) {
            window.alert('🎉 Congratulations! You solved it correctly!');
        } else {
            window.alert('❌ Some entries are incorrect. Keep trying!');
        }
        setHasCompleted(true);
    }, [puzzle, solution, hasCompleted]);

    return (
        <div className="flex flex-col items-center w-full h-screen p-4 min-w-screen">
            <h1 className="text-2xl font-bold mb-4">Sudoku Battle</h1>

            <div className="mb-6 flex flex-col items-center space-y-2">
                <div>
                    <label className="mr-2">Difficulty:</label>
                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="border border-gray-300 px-2 py-1 rounded"
                    >
                        <option key="Random" value="Random">Random</option>
                        {difficulties.map(diff => (
                            <option key={diff.name} value={diff.name}>
                                {diff.name}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => fetchPuzzle(true)}
                        disabled={isGenerating}
                        className={`ml-3 px-4 py-2 rounded text-white font-semibold transition-colors ${isGenerating ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-800'
                            }`}
                    >
                        {isGenerating ? 'Generating…' : 'Generate New Puzzle'}
                    </button>
                </div>
                <div className="font-semibold">
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
            />
        </div>
    );
};

export default HomePage;