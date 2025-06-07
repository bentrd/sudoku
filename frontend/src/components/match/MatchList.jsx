import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import useAuth from '../authentication/useAuth';
import { useNavigate } from 'react-router-dom';
import { formatDuration } from './utils';
import axios from 'axios';

const MatchList = ({ matchList }) => {
  const { accessToken, user } = useAuth();
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const [eloMap, setEloMap] = useState({});

  // Filters & sorting
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterName, setFilterName] = useState('');
  const [sortField, setSortField] = useState('date');  // 'date' or 'time'
  const [sortOrder, setSortOrder] = useState('desc');  // 'asc' or 'desc'

  const computeEloDiffs = (myElo, oppElo) => {
    const K = 32;
    const Ea = 1 / (1 + 10 ** ((oppElo - myElo) / 400));
    const winDiff = Math.round(K * (1 - Ea));
    const loseDiff = Math.round(K * (0 - Ea));
    return { winDiff, loseDiff };
  };

  useEffect(() => {
    const fetchElos = async () => {
      const newEloMap = {};
      await Promise.all(matchList.map(async (m) => {
        if (!m.winnerId) {  // only unfinished
          try {
            const { data } = await axios.get(
              `${import.meta.env.VITE_API_BASE_URL}/api/match/${m.matchId}/elo`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            // data.elos is [{ userId, elo }, …]
            newEloMap[m.matchId] = data.elos.reduce((acc, e) => {
              acc[e.userId] = e.elo;
              return acc;
            }, {});
          } catch (err) {
            console.error('Elo fetch error for', m.matchId, err);
          }
        }
      }));
      setEloMap(newEloMap);
    };
    if (matchList.length) fetchElos();
  }, [matchList, accessToken]);

  const EloDisplay = ({ eloBefore = null, eloAfter, opponentElo = null }) => {
    const DiffDisplay = ({ diff }) => (
      <div className={`font-bold border-l-1 border-gray-300 p-1.5 bg-gray-200 h-full text-[0.6rem] ${diff >= 0 ? 'text-green-500' : 'text-red-400'}`}>
        {diff >= 0 ? `+${diff}` : diff}
      </div>
    );

    let diffDisplays = null;

    if (eloBefore !== null) {
      const diff = eloAfter - eloBefore;
      diffDisplays = <DiffDisplay diff={diff} />;
    } else if (opponentElo !== null) {
      const { winDiff, loseDiff } = computeEloDiffs(eloAfter, opponentElo);
      diffDisplays = (
        <div className="flex items-center">
          <DiffDisplay diff={winDiff} />
          <DiffDisplay diff={loseDiff} />
        </div>
      );
    }

    return (
      <div className={`text-xs text-gray-500 shadow-sm flex items-center overflow-hidden justify-between w-28 bg-gray-100 rounded-full`}>
        <span className="font-semibold justify-self-center px-2 py-0.5">{eloAfter ?? '?'}</span>
        {diffDisplays}
      </div>
    );
  };

  const TimeDisplay = ({ isFinished, createdAt, timeTaken }) => {
    // State for the displayed time string
    const [display, setDisplay] = useState(() => {
      if (isFinished) return formatDuration(timeTaken * 1000);
      const elapsed = Date.now() - new Date(createdAt).getTime();
      return formatDuration(elapsed);
    });

    useEffect(() => {
      if (isFinished) return;
      const interval = setInterval(() => {
        const elapsed = Date.now() - new Date(createdAt).getTime();
        setDisplay(formatDuration(elapsed));
      }, 1000);
      return () => clearInterval(interval);
    }, [createdAt, isFinished]);

    return (
      <div className={`flex items-center gap-2 justify-between w-24 ${isFinished ? 'text-gray-500' : 'text-blue-400'}`}>
        <div className="relative flex-shrink-0">
          {!isFinished && <span className="absolute inline-flex h-5 w-5 rounded-full bg-blue-400 opacity-30 animate-ping"></span>}
          <svg className="relative w-5 h-5 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth={2} className={!isFinished ? 'text-blue-200' : 'text-gray-400'} />
            <line x1="12" y1="12" x2="12" y2="6" strokeWidth={1.5}
              className={`origin-center ${!isFinished ? 'animate-[spin_6s_linear_infinite]' : ''}`} />
            <line x1="12" y1="12" x2="17" y2="12" strokeWidth={1.5}
              className={`origin-center ${!isFinished ? 'animate-[spin_36s_linear_infinite]' : ''}`} />
          </svg>
        </div>
        <span className={`text-sm font-semibold whitespace-nowrap ${isFinished ? 'text-gray-500' : 'text-blue-500'}`}>
          {display}
        </span>
      </div>
    );
  };

  // Filter by status and opponent name
  const processedList = matchList
    .filter(m => {
      // Status filter
      if (filterStatus === 'Win' && m.winnerId !== user.id) return false;
      if (filterStatus === 'Loss' && (m.winnerId === null || m.winnerId === user.id)) return false;
      if (filterStatus === 'In Progress' && m.winnerId !== null) return false;
      // Name filter (against opponentName or ID)
      const name = (m.opponentName || m.opponent).toString().toLowerCase();
      if (filterName && !name.includes(filterName.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      // Determine sort key
      let va, vb;
      if (sortField === 'date') {
        va = new Date(a.createdAt).getTime();
        vb = new Date(b.createdAt).getTime();
      } else {
        // 'time'
        const ta = a.timeTaken != null
          ? a.timeTaken * 1000
          : Date.now() - new Date(a.createdAt).getTime();
        const tb = b.timeTaken != null
          ? b.timeTaken * 1000
          : Date.now() - new Date(b.createdAt).getTime();
        va = ta;
        vb = tb;
      }
      if (va === vb) return 0;
      const cmp = va < vb ? -1 : 1;
      return sortOrder === 'asc' ? cmp : -cmp;
    });


  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden" ref={containerRef}>
      <div>
        {/* Controls */}
        <div className="px-6 py-4 flex flex-wrap items-center gap-4 bg-gray-50 border-b border-gray-200">
          {/* Status filter */}
          <div className="relative inline-block">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="appearance-none bg-white rounded-lg border border-gray-200 shadow-sm px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>All</option>
              <option>In Progress</option>
              <option>Win</option>
              <option>Loss</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <svg className="w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {/* Name filter */}
          <input
            type="text"
            placeholder="Search opponent"
            value={filterName}
            onChange={e => setFilterName(e.target.value)}
            className="bg-white rounded-lg border border-gray-200 shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 min-w-[120px]"
          />
          {/* Sort field */}
          <div className="relative inline-block">
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value)}
              className="appearance-none bg-white rounded-lg border border-gray-200 shadow-sm px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Date</option>
              <option value="time">Time</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <svg className="w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {/* Sort order */}
          <div className="relative inline-block">
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e.target.value)}
              className="appearance-none bg-white rounded-lg border border-gray-200 shadow-sm px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <svg className="w-4 h-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="sticky top-0 bg-gray-100 z-10 px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Players</th>
                <th className="sticky top-0 bg-gray-100 z-10 px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Elo</th>
                <th className="sticky top-0 bg-gray-100 z-10 px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Date</th>
                <th className="sticky top-0 bg-gray-100 z-10 px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {processedList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                    No records found.
                  </td>
                </tr>
              ) : (
                processedList.map((m) => {
                  const isFinished = Boolean(m.winnerId);
                  const isWinner = m.winnerId === user.id;
                  // Choose row tint
                  const rowTint = isFinished
                    ? isWinner
                      ? 'bg-green-50'
                      : 'bg-red-50'
                    : 'bg-white';
                  return (
                    <tr key={m.matchId} className={`${rowTint} hover:bg-gray-100 transition-colors cursor-pointer`} onClick={() => navigate(`/versus/${m.matchId}`)}>
                      {/* Players cell */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className='text-xs'>vs</span>
                          <span className="font-semibold truncate w-24">{m.opponentName || m.opponent}</span>
                        </div>
                      </td>
                      {/* Elo cell */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {isFinished ? (
                          <EloDisplay
                            eloBefore={isWinner ? m.winnerEloBefore : m.loserEloBefore}
                            eloAfter={isWinner ? m.winnerEloAfter : m.loserEloAfter}
                          />
                        ) : (
                          <EloDisplay
                            eloAfter={eloMap[m.matchId]?.[user.id] ?? m.winnerEloBefore}
                            opponentElo={eloMap[m.matchId]?.[m.opponent] ?? m.loserEloBefore}
                          />
                        )}
                      </td>
                      {/* Date cell */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      {/* Time cell */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <TimeDisplay
                          isFinished={isFinished}
                          createdAt={m.createdAt}
                          timeTaken={m.timeTaken}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MatchList;