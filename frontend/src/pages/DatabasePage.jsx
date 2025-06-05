// frontend/src/pages/DatabasePage.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DatabasePage = () => {
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
    <div className="min-w-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Stats Panel */}
          <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Counts by Difficulty</h3>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Difficulty</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option>All</option>
                {Object.keys(stats).map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          {/* Puzzle List */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
              {/* Scrollable area */}
              <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="sticky top-0 bg-gray-100 z-10 px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ID</th>
                      <th className="sticky top-0 bg-gray-100 z-10 px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Category</th>
                      <th className="sticky top-0 bg-gray-100 z-10 px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Difficulty</th>
                      <th className="sticky top-0 bg-gray-100 z-10 px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white border-0 divide-y divide-gray-200 ">
                    {displayed.map((p) => {
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                          <td className="min-h-[2.5rem] whitespace-nowrap text-sm text-gray-800 pl-6">{p.id}</td>
                          <td className="min-h-[2.5rem] whitespace-nowrap text-sm text-gray-800">{p.category}</td>
                          <td className="min-h-[2.5rem] whitespace-nowrap text-sm text-gray-800">{p.difficulty}</td>
                          <td className="whitespace-nowrap text-sm text-gray-800 flex justify-between w-full min-h-[2.5rem]">
                            <div className="flex-1 min-h-[2.5rem] bg-blue-500 hover:bg-blue-600 text-white font-bold flex items-center justify-center cursor-pointer" onClick={() => window.open(`/?puzzle=${p.id}`, '_blank')}>
                              <span>Play</span>
                            </div>
                            <div className="flex-1 min-h-[2.5rem] text-blue-500 hover:text-blue-600 hover:bg-gray-200 font-bold flex items-center justify-center cursor-pointer" onClick={() => window.open(`/solver?puzzle=${p.id}`, '_blank')}>
                              <span>Solver</span>
                            </div>
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
    </div>
  );
};

export default DatabasePage;