// components/Switch.jsx
import React from 'react';
import './Switch.css'; // you can style .switch and .active

const Switch = ({ mode, onChange }) => (
  <div className="switch">
    <button
      type="button"
      className={mode === 'number' ? 'active' : ''}
      onClick={() => onChange('number')}
    >
      Number Mode
    </button>
    <button
      type="button"
      className={mode === 'candidate' ? 'active' : ''}
      onClick={() => onChange('candidate')}
    >
      Candidate Mode
    </button>
  </div>
);

export default Switch;