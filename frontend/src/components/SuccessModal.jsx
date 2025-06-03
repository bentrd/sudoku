// frontend/src/components/SuccessModal.jsx
import React, { useEffect, useState } from 'react';

/**
 * SuccessModal
 *
 * Props:
 *  - isOpen: boolean       // whether the modal is currently visible
 *  - onClose: () => void   // callback to close the modal
 */
const SuccessModal = ({ isOpen, onClose }) => {
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset animation state, then trigger on next frame for dramatic entrance
      setAnimateIn(false);
      requestAnimationFrame(() => {
        setAnimateIn(true);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // When closing, first animate out, then invoke onClose after 500ms
  const handleClose = () => {
    setAnimateIn(false);
    setTimeout(() => {
      onClose();
    }, 500); // match transition duration
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-white/30 backdrop-blur transition-all duration-500 ease-out ${
        animateIn ? 'backdrop-blur-lg opacity-100' : 'backdrop-blur-0 opacity-0'
      }`}
    >
      <div
        className={`bg-white rounded-lg p-6 w-80 shadow-[0px_0px_20px_10px_rgba(0,0,0,0.25)] transform transition-all duration-500 ease-out ${
          animateIn
            ? 'scale-100 translate-y-0 opacity-100'
            : 'scale-75 translate-y-12 opacity-0'
        }`}
      >
        <h2 className="text-3xl font-extrabold mb-4 text-center">🎉 Congratulations!</h2>
        <p className="mb-6 text-center text-lg">You have solved the puzzle correctly.</p>
        <div className="flex justify-center">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;