import React from 'react';
import PlayerNameTag from './PlayerNameTag';

// A simple progress bar (0..1) with configurable color
export const ProgressBar = ({ progress = 0, color }) => {
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className="h-full transition-all duration-200"
        style={{
          width: `${Math.min(Math.max(progress, 0), 1) * 100}%`,
          backgroundColor: color
        }}
      />
    </div>
  );
};

// Renders a label + horizontal progress bar beneath it
const PlayerProgress = ({ name, country, progress, color }) => (
  <div className="flex flex-col items-start">
    <PlayerNameTag name={name} country={country} />
    <div className="w-full mt-1">
      <ProgressBar progress={progress} color={color} />
    </div>
  </div>
);

export default PlayerProgress;