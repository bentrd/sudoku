import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../authentication/useAuth';

/**
 * Helper: format a duration (in ms) into a human-readable string:
 *  - If < 60s, show "XXs"
 *  - If < 60m, show "XXm YYs"
 *  - If < 24h, show "XXh YYm"
 *  - Else show "ZZd XXh"
 */
function formatDuration(ms) {
    ms = Number(ms) || 0; // Ensure ms is a number
    const totalSeconds = Math.floor(ms / 1000);
    if (totalSeconds < 60) {
        return `${totalSeconds}s`;
    }
    const totalMinutes = Math.floor(totalSeconds / 60);
    if (totalMinutes < 60) {
        const secs = totalSeconds % 60;
        return `${totalMinutes}m ${secs}s`;
    }
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) {
        const mins = totalMinutes % 60;
        return `${totalHours}h ${mins}m`;
    }
    const totalDays = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return `${totalDays}d ${hours}h`;
}

// A single match card
const MatchCard = ({ match }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [elapsed, setElapsed] = useState('');

    // Determine if we won/lost/ongoing
    // Assume match.winnerId is null if not finished, else an ID.
    let tint = 'bg-gray-100';
    let borderColor = 'border-gray-300';
    console.log('Match data:', match);
    if (match.winnerId) {
        if (match.winnerId === user.id) {
            tint = 'bg-green-100';
            borderColor = 'border-green-300';
        } else {
            tint = 'bg-red-100';
            borderColor = 'border-red-300';
        }
    }

    // Parse createdAt as Date
    const createdAt = new Date(match.createdAt);
    console.log('Match created at:', match);

    // Effect: update elapsed every second if match not finished
    useEffect(() => {
        if (match.winnerId) {
            return; // no need to update elapsed if finished
        }
        const update = () => {
            const now = Date.now();
            const diff = now - createdAt.getTime();
            setElapsed(formatDuration(diff));
        };
        update();
        const timer = setInterval(update, 1000);
        return () => clearInterval(timer);
    }, [match.winnerId, createdAt]);

    // Determine display for time: if finished, show timeTaken (assumed in seconds), else show elapsed
    const timeDisplay = match.winnerId
        ? `${formatDuration(match.timeTaken * 1000)}`
        : elapsed;

    return (
        <div
            onClick={() => navigate(`/versus/${match.matchId}`)}
            className={`${tint} cursor-pointer ${borderColor} border rounded-lg p-4 hover:shadow-md transition mb-4`}
        >
            <div className="flex justify-between items-center min-w-[500px]">
                <span className="text-gray-800">
                    <span className='font-semibold'>{user.username}</span> vs <span className='font-semibold'>{match.opponentName || match.opponent}</span>
                </span>
                <span className="text-sm text-gray-600">
                    {timeDisplay}    
                </span>
            </div>
            {/* You can add more details here, e.g. difficulty/category if available: */}
            {match.difficulty && (
                <div className="mt-2 text-sm text-gray-700">
                    Difficulty: {match.difficulty}, Category: {match.category}
                </div>
            )}
        </div>
    );
};

const MatchList = ({ matchList }) => {
    if (!Array.isArray(matchList) || matchList.length === 0) {
        return <p className="text-gray-700 mb-4">You have no current matches.</p>;
    }

    return (
        <div>
            {matchList.map((m) => (
                <MatchCard key={m.matchId} match={m} />
            ))}
        </div>
    );
};

export default MatchList;