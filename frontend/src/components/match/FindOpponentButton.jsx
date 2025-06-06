import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useAuth from '../authentication/useAuth';
import { useNavigate } from 'react-router-dom';

const FindOpponentButton = ({ className }) => {
    const { accessToken, user } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState('idle'); // 'idle' | 'waiting' | 'matched'

    // Poll /api/match/status every 2 seconds if waiting
    useEffect(() => {
        let intervalId;
        if (status === 'waiting') {
            intervalId = setInterval(async () => {
                try {
                    const resp = await axios.get(
                        `${import.meta.env.VITE_API_BASE_URL}/api/match/status`,
                        { headers: { Authorization: `Bearer ${accessToken}` } }
                    );
                    if (resp.data.status === 'matched') {
                        setStatus('matched');
                        clearInterval(intervalId);
                        console.log('Match found:', resp.data);
                        const matchId = resp.data.match.id || resp.data.match.matchId;
                        if (matchId) {
                            const url = `/versus/${matchId}`;
                            navigate(url);
                        }
                    }
                } catch (err) {
                    console.error('Status poll error:', err);
                }
            }, 2000);
        }
        return () => clearInterval(intervalId);
    }, [status, accessToken, navigate]);

    const handleFindOpponent = async () => {
        setStatus('waiting');
        try {
            const resp = await axios.post(
                `${import.meta.env.VITE_API_BASE_URL}/api/match/join`,
                { userId: user.id },
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (resp.data.status === 'matched') {
                setStatus('matched');
                const match = resp.data.match;
                const matchId = match.id || match?.matchId;
                if (matchId) {
                    const url = `/versus/${matchId}`;
                    // Navigate via React Router immediately
                    navigate(url);
                }
            } else {
                setStatus('waiting');
            }
        } catch (err) {
            console.error('Error joining match queue:', err);
            setStatus('idle');
        }
    };

    // conditional styles based on status
    const style = {
        idle: 'bg-blue-600 text-white hover:bg-blue-700',
        waiting: 'bg-white border-2 border-blue-600 hover:bg-gray-100 hover:border-blue-700 text-blue-600 hover:text-blue-700',
        matched: 'bg-white border-2 border-green-600 hover:bg-gray-100 hover:border-green-700 text-green-600 hover:text-green-700',
    }[status];

    return (
        <button
            onClick={handleFindOpponent}
            className={`px-6 py-3 w-50 h-12 font-bold shadow-md rounded-full transition ${style} ${className}`}
            disabled={status === 'waiting' || status === 'matched'}
        >
            {status === 'idle' && 'Find Opponent'}
            {status === 'waiting' && 'Searching...'}
            {status === 'matched' && 'Matched!'}
        </button>
    );
};

export default FindOpponentButton;