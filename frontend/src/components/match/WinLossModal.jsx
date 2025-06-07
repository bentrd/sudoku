import React, { useState, useEffect } from 'react';
import FindOpponentButton from './FindOpponentButton';
import { formatDuration } from './utils';
import styles from './WinLossModal.module.css';

// ----- EloAnimation Component -----
const EloAnimation = ({ before, after, isWinner }) => {
  const [showAfter, setShowAfter] = useState(false);
  const bStr = before.toString();
  const aStr = after.toString();
  const maxLen = Math.max(bStr.length, aStr.length);
  const bDigits = bStr.padStart(maxLen, ' ').split('');
  const aDigits = aStr.padStart(maxLen, ' ').split('');

  // Timings
  const initialDelay = 800;

  // 1) After initial delay, start slide
  useEffect(() => {
    const timer = setTimeout(() => setShowAfter(true), initialDelay);
    return () => clearTimeout(timer);
  }, []);

  // 2) Once slide starts, do a single green pulse then fade
  useEffect(() => {
    if (!showAfter) return;
    return () => clearTimeout(timer2);
  }, [showAfter]);

  return (
    <div className={styles.eloAnimation}>
      {bDigits.map((bd, idx) => {
        const ad = aDigits[idx];
        const changed = bd !== ad;
        const delayMs = idx * 150;
        return (
          <span key={idx} className={styles.eloDigit}>
            <span
              className={`${styles.eloOld} ${showAfter && changed ? styles.slideUp : ''}`}
              style={{ transitionDelay: `${delayMs}ms` }}
            >{bd}</span>
            <span
              className={`${styles.eloNew} ${showAfter && changed ? styles.slideIn : ''} ${isWinner ? styles.greenPulse : styles.redPulse}`}
              style={{ transitionDelay: `${delayMs}ms` }}
            >{ad}</span>
            {!changed && <span className={styles.eloOld}>{bd}</span>}
          </span>
        );
      })}
    </div>
  );
};

/**
 * WinLossModal
 * Props:
 *  - isWinner
 *  - eloBefore, eloAfter
 *  - time (seconds)
 *  - onSendToSolver(), onClose()
 */
const WinLossModal = ({
  isWinner,
  eloBefore,
  eloAfter,
  time,
  onSendToSolver,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#ffffff99]">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center border border-gray-200">
        {isWinner ? (
          <h2 className="text-2xl font-bold text-green-600 mb-4">Victory 🏆</h2>
        ) : (
          <h2 className="text-2xl font-bold text-red-600 mb-4">Defeat 😢</h2>
        )}

        {/* Animated Elo change */}
        <div className="mb-4 border-y border-gray-200 pt-4">
          <h3 className="text-xs text-gray-400">Updated ELO:</h3>
          <EloAnimation before={eloBefore} after={eloAfter} isWinner={isWinner} />
        </div>

        {/* Finish time */}
        <p className="mb-4">
          {isWinner ? 'Finished in ' : 'Opponent finished in '}
          <span className="font-bold">{formatDuration(time * 1000)}</span>
        </p>

        <div className="mt-4 flex flex-col gap-3 justify-center items-stretch">
          <button
            onClick={onSendToSolver}
            className="h-12 font-bold flex items-center justify-center px-4 bg-green-600 text-white rounded-full hover:bg-green-700"
          >
            Send to Solver
          </button>
          <div className="h-12 flex items-center justify-center">
            <FindOpponentButton className="h-full w-full" />
          </div>
          <button
            onClick={onClose}
            className="h-12 font-bold flex items-center justify-center px-4 bg-gray-600 text-white rounded-full hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div >
  );
};

export default WinLossModal;