// frontend/src/pages/VersusPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuth from '../components/authentication/useAuth';
import SudokuGrid from '../components/SudokuGrid';
import FindOpponentButton from '../components/match/FindOpponentButton';
import WinLossModal from '../components/match/WinLossModal';
import PlayerProgress from '../components/match/PlayerProgress';
import MatchList from '../components/match/MatchList';

const VersusPage = () => {
  const { accessToken, user } = useAuth();
  const { matchId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState(null);
  const [myBoardState, setMyBoardState] = useState(null);
  const [error, setError] = useState(null);

  // Track current user's progress (0..1)
  const [myProgress, setMyProgress] = useState(0);
  const [myProgressColor, setMyProgressColor] = useState('green');
  const [oppProgressColor, setOppProgressColor] = useState('green');
  const [showOpponent, setShowOpponent] = useState(true);
  // Opponent’s progress
  const [opponentProgress, setOpponentProgress] = useState(0);

  // When listing all matches:
  const [matchList, setMatchList] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  // Win/loss modal state
  const [showModal, setShowModal] = useState(false);
  const [winnerId, setWinnerId] = useState(null);
  const [timeTaken, setTimeTaken] = useState(null);

  const boardRef = useRef(myBoardState);
  useEffect(() => {
    boardRef.current = myBoardState;
  }, [myBoardState]);

  // Called whenever we (re)send our board to the server
  const handleBoardChange = (boardState) => {
    setMyBoardState(boardState);
    axios
      .patch(
        `http://localhost:3001/api/match/${matchId}/board`,
        { boardState },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      .then((resp) => {
        const updatedParticipants = resp.data.participants;
        const me = updatedParticipants.find((p) => p.userId === user.id);
        const opp = updatedParticipants.find((p) => p.userId !== user.id);
        if (me) {
          setMyProgress(me.progress);
          setMyProgressColor(me.hasMistake ? 'red' : 'green');
        }
        if (opp) {
          setOpponentProgress(opp.progress);
          setOppProgressColor(opp.hasMistake ? 'red' : 'green');
        }
        // Handle win/loss from top-level response
        if (resp.data.winnerId) {
          setWinnerId(resp.data.winnerId);
          setTimeTaken(resp.data.timeTaken || null);
          setShowModal(true);
        }
      })
      .catch((err) => console.error('Failed to save board state:', err));
  };

  useEffect(() => {
    if (!accessToken || !user) {
      navigate('/auth', {
        replace: true,
        state: { from: matchId ? `/versus/${matchId}` : '/versus' },
      });
      return;
    }

    // No matchId → show “Your Matches” + “Find Opponent”
    if (!matchId) {
      const fetchMatches = async () => {
        try {
          const resp = await axios.get('http://localhost:3001/api/match', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          setMatchList(resp.data.matches || []);
        } catch (err) {
          console.error('Error fetching match list:', err);
        } finally {
          setListLoading(false);
        }
      };
      fetchMatches();
      return;
    }

    // Otherwise, fetch this match’s data
    const fetchMatch = async () => {
      try {
        const resp = await axios.get(
          `http://localhost:3001/api/match/${matchId}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        const data = resp.data;
        setMatchData(data);
        // Win/Loss top-level fields
        setWinnerId(data.winnerId || null);
        setTimeTaken(data.timeTaken || null);

        // Build an 81-cell blank grid:
        const blankGrid = Array(81)
          .fill()
          .map(() => ({
            digit: null,
            candidates: [],
            centerCands: [],
            color: null,
          }));

        // Find our participant and the opponent
        const meRow = data.participants.find((p) => p.userId === user.id);
        const oppRow = data.participants.find((p) => p.userId !== user.id);

        const myInitial =
          Array.isArray(meRow.boardState) && meRow.boardState.length === 81
            ? meRow.boardState
            : blankGrid;

        setMyBoardState(myInitial);
        setMyProgress(meRow.progress);
        setMyProgressColor(meRow.hasMistake ? 'red' : 'green');
        setOpponentProgress(oppRow.progress);
        setOppProgressColor(oppRow.hasMistake ? 'red' : 'green');

        setLoading(false);
      } catch (err) {
        console.error('Error fetching match:', err);
        setError(err.response?.data?.error || 'Unable to load match');
        setLoading(false);
      }
    };
    fetchMatch();

    // Poll every 2s by re-sending our board (to refresh opponent progress & win/loss)
    const pollInterval = setInterval(() => {
      const latestBoard = boardRef.current;
      if (latestBoard) {
        axios
          .patch(
            `http://localhost:3001/api/match/${matchId}/board`,
            { boardState: latestBoard },
            { headers: { Authorization: `Bearer ${accessToken}` } }
          )
          .then((resp) => {
            const updatedParticipants = resp.data.participants;
            const me = updatedParticipants.find((p) => p.userId === user.id);
            const opp = updatedParticipants.find((p) => p.userId !== user.id);
            if (me) {
              setMyProgress(me.progress);
              setMyProgressColor(me.hasMistake ? 'red' : 'green');
            }
            if (opp) {
              setOpponentProgress(opp.progress);
              setOppProgressColor(opp.hasMistake ? 'red' : 'green');
            }
            // Handle win/loss
            if (resp.data.winnerId) {
              setWinnerId(resp.data.winnerId);
              setTimeTaken(resp.data.timeTaken || null);
              setShowModal(true);
            }
          })
          .catch(() => {
            /* ignore polling errors */
          });
      }
    }, 2000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [accessToken, matchId, navigate]);

  // --- Render logic ---

  // 1) If we’re on /versus/:matchId and still loading
  if (matchId && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading match…</p>
      </div>
    );
  }

  // 2) If (matchId) but error occurred
  if (matchId && error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => navigate('/versus')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Versus
        </button>
      </div>
    );
  }

  // 3) If no matchId at all → show match list + find-opponent
  if (!matchId) {
    if (listLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-lg">Loading your matches…</p>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col items-center p-4">
        <h1 className="text-3xl font-bold mb-6">Your Matches</h1>
        <FindOpponentButton className="mb-4" />
        <MatchList matchList={matchList} />
      </div>
    );
  }

  // 4) We have matchId & matchData; show the versus UI
  // Decide how to label “You” vs opponent
  const currentUserId = user.id;
  let playerAName = `You (${currentUserId})`;
  let playerBName = `Opponent`;
  if (matchData?.participants) {
    const me = matchData.participants.find((p) => p.userId === currentUserId);
    const opp = matchData.participants.find((p) => p.userId !== currentUserId);
    if (me) {
      playerAName = me.username || `You (${me.userId})`;
    }
    if (opp) {
      playerBName = opp.username || `Opponent (${opp.userId})`;
    }
  }

  return (
    <>
      {showModal && (
        <WinLossModal
          isWinner={winnerId === user.id}
          time={timeTaken}
          onSendToSolver={() => navigate(`/solver?puzzle=${matchData.gameId}`)}
          onClose={() => navigate('/')}
        />
      )}

      <div className="min-h-screen flex flex-col items-center p-4 bg-gray-50">
        <div className="w-full max-w-4xl">
          <div className="flex flex-row gap-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 mb-6">
            {/* Current user progress */}
            <div className="flex-1 flex items-center justify-start p-3 rounded border border-gray-200 shadow-md">
              <div className="w-full">
                <PlayerProgress
                  name={playerAName}
                  progress={myProgress}
                  color={myProgressColor}
                />
              </div>
            </div>
            {/* Opponent progress (click to hide) */}
            <div
              className={
                showOpponent
                  ? 'flex-1 p-3 rounded border border-gray-200'
                  : 'flex-1 p-3 rounded border border-gray-200 opacity-50'
              }
            >
              <div
                className="relative group cursor-pointer"
                onClick={() => setShowOpponent(!showOpponent)}
              >
                <PlayerProgress
                  name={playerBName}
                  progress={showOpponent ? opponentProgress : 1}
                  color={showOpponent ? oppProgressColor : 'gray'}
                />
                <div className="hidden group-hover:flex absolute inset-0 bg-white opacity-50 items-center justify-center text-black font-bold">
                  HIDE
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <SudokuGrid
              initialPuzzle={matchData.puzzle.split('').map((c) => Number(c))}
              originalPuzzle={matchData.puzzle.split('').map((c) => Number(c))}
              boardState={myBoardState}
              disabled={Boolean(winnerId)}
              onBoardChange={handleBoardChange}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default VersusPage;