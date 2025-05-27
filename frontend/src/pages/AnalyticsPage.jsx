import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SudokuGrid from '../components/SudokuGrid';

const AnalyticsPage = () => {
    const [count, setCount] = useState(1);
    const [loading, setLoading] = useState(false);
    const [puzzles, setPuzzles] = useState([]);
    const [filter, setFilter] = useState('All');
    const [stats, setStats] = useState({});

    // Fetch all puzzles from the database
    const fetchPuzzles = async () => {
        try {
            const res = await axios.get('http://localhost:3001/api/sudoku/games');
            setPuzzles(res.data);
        } catch (err) {
            console.error('Failed to load puzzles:', err);
        }
    };

    useEffect(() => {
        fetchPuzzles();
    }, []);

    // Compute stats whenever puzzles change
    useEffect(() => {
        const counts = puzzles.reduce((acc, p) => {
            const cat = p.category;
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
        }, {});
        setStats(counts);
    }, [puzzles]);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            // fire off all generation requests in parallel
            await Promise.all(
                Array.from({ length: count }, (_, i) =>
                    axios.get('http://localhost:3001/api/sudoku', {
                        params: {
                            difficulty: 'random',
                            // add a unique nonce to bust caches
                            nonce: `${Date.now()}_${i}`
                        }
                    })
                        .catch(err => console.error('Generation error:', err))
                )
            );
            // refresh the list after all are done
            await fetchPuzzles();
        } finally {
            // if all requests are done, set loading to false
            setLoading(false);
        }
    };

    // Filter puzzles by selected difficulty
    const displayed = puzzles.filter(p => filter === 'All' || p.category === filter);

    return (
        <div style={{ padding: '2rem' }}>
            <h2>Sudoku Generation Analytics</h2>

            <div style={{ marginBottom: '1rem' }}>
                <label>Number to generate: </label>
                <input
                    type="number"
                    min={1}
                    value={count}
                    onChange={e => setCount(Number(e.target.value))}
                    style={{ width: '4rem', marginRight: '1rem' }}
                />
                <button onClick={handleGenerate} disabled={loading}>
                    {loading ? 'Generating…' : 'Generate'}
                </button>
            </div>

            <div style={{ display: 'flex', gap: '2rem' }}>
                {/* Stats panel */}
                <div style={{ flex: '0 0 200px', border: '1px solid #ccc', padding: '1rem' }}>
                    <h3>Counts by Difficulty</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {Object.entries(stats).map(([cat, num]) => (
                            <li key={cat}>{cat}: {num}</li>
                        ))}
                        <span style={{ fontWeight: 'bold' }}>Total: {puzzles.length}</span>
                    </ul>

                    <div style={{ marginTop: '1rem' }}>
                        <label>Filter by Difficulty: </label>
                        <select value={filter} onChange={e => setFilter(e.target.value)}>
                            <option>All</option>
                            {Object.keys(stats).map(cat => (
                                <option key={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Puzzle list */}
                <div style={{ minWidth: "400px", maxHeight: '600px', overflowY: 'auto', overflowX: 'hidden' }}>
                    <table style={{ width: '90%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={{ border: '1px solid #ccc', padding: '4px' }}>ID</th>
                                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Difficulty</th>
                                <th style={{ border: '1px solid #ccc', padding: '4px' }}>Rating</th>
                                <th style={{ border: '1px solid #ccc', padding: '4px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayed.map(p => {
                                // build puzzle string query param: convert spaces to zeros
                                const puzzleParam = p.puzzle.replace(/ /g, '0');
                                return (
                                    <tr
                                        key={p.id}
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => window.open(`/?puzzle=${puzzleParam}`, '_blank')}
                                    >
                                        <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                                            {p.id}
                                        </td>
                                        <td style={{ border: '1px solid #ccc', padding: '4px' }}>{p.category}</td>
                                        <td style={{ border: '1px solid #ccc', padding: '4px' }}>{p.difficulty}</td>
                                        <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        await axios.delete(
                                                            `http://localhost:3001/api/sudoku/games/${p.id}`
                                                        );
                                                        // Refresh list
                                                        await fetchPuzzles();
                                                    } catch (err) {
                                                        console.error('Delete failed:', err);
                                                    }
                                                }}
                                                style={{ color: 'white', backgroundColor: '#333', border: 'none', padding: '4px 8px', cursor: 'pointer' }}
                                            >X</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
