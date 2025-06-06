import React from 'react';
import FindOpponentButton from './FindOpponentButton';
import { useNavigate } from 'react-router-dom';

const WinLossModal = ({ isWinner, time, onSendToSolver, onPlayAgain, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#ffffff99]">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center border border-gray-200">
        {isWinner ? (
          <h2 className="text-2xl font-bold text-green-600 mb-4">You Win!</h2>
        ) : (
          <h2 className="text-2xl font-bold text-red-600 mb-4">You Lose :(</h2>
        )}
        <p className="mb-4">
          {isWinner
            ? `Finished in ${time}s`
            : `Opponent finished in ${time}s`}
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
    </div>
  );
};

export default WinLossModal;