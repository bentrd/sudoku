import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Props:
 *  - matchList: array of { matchId, opponentName or opponent }
 */
const MatchList = ({ matchList }) => {
  const navigate = useNavigate();

  if (matchList.length === 0) {
    return <p className="text-gray-700 mb-4">You have no current matches.</p>;
  }

  return (
    <ul className="w-full max-w-md space-y-2 mb-6">
      {matchList.map((m) => (
        <li key={m.matchId}>
          <button
            onClick={() => navigate(`/versus/${m.matchId}`)}
            className="w-full text-left px-4 py-2 bg-white rounded shadow hover:bg-gray-100"
          >
            Match #{m.matchId} vs. {m.opponentName || m.opponent}
          </button>
        </li>
      ))}
    </ul>
  );
};

export default MatchList;