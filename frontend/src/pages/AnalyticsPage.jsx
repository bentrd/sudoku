// frontend/src/pages/AnalyticsPage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
        Array.from({ length: count }, () =>
          axios
            .get('http://localhost:3001/api/sudoku/generate', {
              params: { difficulty: 'random', nonce: Date.now() },
            })
            .catch((err) => console.error('Generation error:', err))
        )
      );
      // refresh the list after all are done
      await fetchPuzzles();
    } finally {
      setLoading(false);
    }
  };

  // Filter puzzles by selected difficulty
  const displayed = puzzles.filter(
    (p) => filter === 'All' || p.category === filter
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">
          Sudoku Generation Analytics
        </h2>

        {/* Generate Section */}
        <div className="flex items-center mb-8 space-x-4">
          <label className="text-gray-700 font-medium">Generate:</label>
          <input
            type="number"
            min={1}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-16 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white font-medium transition-colors ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row lg:space-x-8">
          {/* Stats Panel */}
          <div className="bg-white rounded-lg shadow p-6 mb-8 lg:mb-0 lg:w-1/4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Counts by Difficulty
            </h3>
            <ul className="space-y-2">
              {Object.entries(stats).map(([cat, num]) => (
                <li key={cat} className="flex justify-between text-gray-700">
                  <span>{cat}</span>
                  <span>{num}</span>
                </li>
              ))}
              <li className="flex justify-between font-bold text-gray-800 border-t pt-2 mt-2">
                <span>Total</span>
                <span>{puzzles.length}</span>
              </li>
            </ul>

            <div className="mt-6">
              <label className="block text-gray-700 font-medium mb-2">
                Filter by Difficulty
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>All</option>
                {Object.keys(stats).map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Puzzle List */}
          <div className="flex-1">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg shadow">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-4 py-2 text-left text-gray-700 font-medium">
                      ID
                    </th>
                    <th className="px-4 py-2 text-left text-gray-700 font-medium">
                      Category
                    </th>
                    <th className="px-4 py-2 text-left text-gray-700 font-medium">
                      Rating
                    </th>
                    <th className="px-4 py-2 text-left text-gray-700 font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((p) => {
                    // build puzzle string query param: convert spaces to zeros
                    const puzzleParam = p.puzzle.replace(/ /g, '0');
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-gray-50 even:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 text-gray-800">{p.id}</td>
                        <td className="px-4 py-3 text-gray-800">
                          {p.category}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {p.difficulty}
                        </td>
                        <td className="px-4 py-3 space-x-2">
                          <button
                            onClick={() =>
                              window.open(`/?puzzle=${p.id}`, '_blank')
                            }
                            className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-100 transition-colors"
                          >
                            Play
                          </button>
                          <button
                            onClick={() =>
                              window.open(
                                `/solver?puzzle=${puzzleParam.replace(/0/g, '.')}`,
                                '_blank'
                              )
                            }
                            className="px-3 py-1 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-100 transition-colors"
                          >
                            Solver
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;