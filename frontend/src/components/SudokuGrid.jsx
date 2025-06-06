import { useState, useRef, useEffect } from 'react';

/**
 * SudokuGrid
 *
 * Props:
 *  - initialPuzzle: number[81] (0 means empty; 1–9 is a given or previously filled digit)
 *  - originalPuzzle: number[81] (0 means not given; 1–9 means “locked” given)
 *  - disabled: boolean — if true, all input is locked
 */
const SudokuGrid = ({
    initialPuzzle,
    originalPuzzle,
    disabled,
    onBoardChange,
    boardState,
    boardSize = '600px',
}) => {
    // Each cell: { digit: number | null, candidates: number[], centerCands: number[], color: string | null }
    const emptyCell = { digit: null, candidates: [], centerCands: [], color: null };

    // Internal board state: 81 Cell objects
    const [board, setBoard] = useState(() =>
        Array(81).fill().map(() => ({ ...emptyCell }))
    );

    // Which cells are currently selected
    const [selected, setSelected] = useState(() => Array(81).fill(false));
    const isMouseDown = useRef(false);
    // Index of the currently focused cell for arrow navigation
    const [focusIndex, setFocusIndex] = useState(0);

    // Track Shift/Ctrl for temporary mode override
    const [modifiers, setModifiers] = useState({ shift: false, ctrl: false });

    // Track last cleared selection signature (for “clear once layer, clear twice entirely”)
    const [lastClearedSignature, setLastClearedSignature] = useState(null);

    // Internal mode state: 'number' | 'candidate' | 'center' | 'color'
    const [mode, setMode] = useState('number');

    // Track if there is a mistake (conflict) anywhere on the board
    const [hasMistake, setHasMistake] = useState(false);

    // Helper: Detect if there is any mistake/conflict on the board
    const detectMistake = (boardArr) => {
      for (let idx = 0; idx < 81; idx++) {
        const cell = boardArr[idx];
        const digit = cell.digit;
        if (digit >= 1 && digit <= 9) {
          if (hasConflict(idx, digit)) {
            return true;
          }
        }
      }
      return false;
    };

    // 9‐color palette for “color” mode
    const palette = [
        '#1f77b4', // blue
        '#ff7f0e', // orange
        '#2ca02c', // green
        '#d62728', // red
        '#9467bd', // purple
        '#8c564b', // brown
        '#e377c2', // pink
        '#7f7f7f', // gray
        '#bcbd22'  // olive
    ];

    // ────────────────────────────────────────────────
    // Undo/Redo stacks
    // ────────────────────────────────────────────────
    const [undoStack, setUndoStack] = useState([]);
    const [redoStack, setRedoStack] = useState([]);

    // Helper to deep clone board
    const cloneBoard = (b) => b.map(cell => ({
        digit: cell.digit,
        candidates: [...cell.candidates],
        centerCands: [...cell.centerCands],
        color: cell.color
    }));

    // ────────────────────────────────────────────────
    // 1) Initialize board ONCE on mount
    // ────────────────────────────────────────────────
    // Initialize board once when component mounts
    const hasInitializedRef = useRef(false);
    useEffect(() => {
        if (hasInitializedRef.current) return;
        hasInitializedRef.current = true;

        if (Array.isArray(boardState) && boardState.length === 81) {
            // Deep‐clone each cell object
            setBoard(boardState.map(cell => ({
                digit: cell.digit,
                candidates: Array.isArray(cell.candidates) ? [...cell.candidates] : [],
                centerCands: Array.isArray(cell.centerCands) ? [...cell.centerCands] : [],
                color: cell.color || null,
            })));
        } else {
            // Otherwise, build fresh board from initialPuzzle/originalPuzzle
            const newBoard = initialPuzzle.map((val, idx) => {
                const isGiven = originalPuzzle[idx] >= 1 && originalPuzzle[idx] <= 9;
                if (isGiven) {
                    return { digit: originalPuzzle[idx], candidates: [], centerCands: [], color: null };
                }
                if (val >= 1 && val <= 9) {
                    // A previously filled‐in digit
                    return { digit: val, candidates: [], centerCands: [], color: null };
                }
                return { ...emptyCell };
            });
            setBoard(newBoard);
        }

        // Clear selection and reset states on first load
        setSelected(Array(81).fill(false));
        setLastClearedSignature(null);
        setMode('number');
        setFocusIndex(0);
    }, []);

    // ────────────────────────────────────────────────
    // 2) TRACK SHIFT/CTRL KEYS FOR TEMP MODE OVERRIDE
    // ────────────────────────────────────────────────
    useEffect(() => {
        const onKeyDown = (e) => {
            let upd = null;
            if (e.key === 'Shift') {
                upd = { shift: true, ctrl: modifiers.ctrl };
            }
            if (e.key === 'Control') {
                upd = { shift: modifiers.shift, ctrl: true };
            }
            if (upd) {
                setModifiers(upd);
            }
        };
        const onKeyUp = (e) => {
            let upd = null;
            if (e.key === 'Shift') {
                upd = { shift: false, ctrl: modifiers.ctrl };
            }
            if (e.key === 'Control') {
                upd = { shift: modifiers.shift, ctrl: false };
            }
            if (upd) {
                setModifiers(upd);
            }
        };
        window.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('keyup', onKeyUp, true);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('keyup', onKeyUp, true);
        };
    }, [modifiers]);

    // ────────────────────────────────────────────────
    // 2b) SYNC MODE WITH MODIFIERS
    // ────────────────────────────────────────────────
    useEffect(() => {
        if (modifiers.shift && modifiers.ctrl) {
            setMode('color');
        } else if (modifiers.shift) {
            setMode('candidate');
        } else if (modifiers.ctrl) {
            setMode('center');
        } else {
            setMode('number');
        }
    }, [modifiers]);

    // ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    // 3) GLOBAL KEY HANDLING: Ctrl+A, Backspace, Digit → update board locally
    // ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const onGlobalKeyDown = (e) => {
            if (disabled) return;

            // a) Ctrl+A / Cmd+A => select all cells
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                e.stopPropagation();
                setSelected(() => Array(81).fill(true));
                return;
            }

            // b) Backspace => clear the currently selected layer (or digit)
            if (e.key === 'Backspace') {
                e.preventDefault();
                e.stopPropagation();
                handleClear();
                return;
            }

            // c) Digit via e.code => handleNumpadClick
            let val = null;
            if (e.code && e.code.startsWith('Digit')) {
                const d = parseInt(e.code.slice(5), 10);
                if (!isNaN(d) && d >= 0 && d <= 9) val = d;
            } else if (e.code && e.code.startsWith('Numpad')) {
                const d = parseInt(e.code.slice(6), 10);
                if (!isNaN(d) && d >= 0 && d <= 9) val = d;
            }

            if (val !== null) {
                e.preventDefault();
                e.stopPropagation();
                // Temporarily override mode if Shift/Ctrl are held
                let appliedMode = mode;
                if (e.shiftKey && e.ctrlKey) appliedMode = 'color';
                else if (e.shiftKey) appliedMode = 'candidate';
                else if (e.ctrlKey) appliedMode = 'center';
                handleNumpadClick(val, appliedMode);
                return;
            }

            // Arrow‐key navigation: move focus cursor
            if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
                const currIdx = focusIndex;
                let newIdx = currIdx;
                const row = Math.floor(currIdx / 9);
                const col = currIdx % 9;
                if (e.key === 'ArrowLeft' && col > 0) newIdx = currIdx - 1;
                else if (e.key === 'ArrowRight' && col < 8) newIdx = currIdx + 1;
                else if (e.key === 'ArrowUp' && row > 0) newIdx = currIdx - 9;
                else if (e.key === 'ArrowDown' && row < 8) newIdx = currIdx + 9;
                const additive = e.shiftKey || e.ctrlKey;
                setSelected(old => {
                    if (additive) {
                        const c = [...old];
                        c[newIdx] = true;
                        return c;
                    } else {
                        const c = Array(81).fill(false);
                        c[newIdx] = true;
                        return c;
                    }
                });
                setFocusIndex(newIdx);
                return;
            }

            // Allow Ctrl+Z / Cmd+Z and Ctrl+Shift+Z / Cmd+Shift+Z to reach undo/redo
            const keyLower = e.key.toLowerCase();
            if ((e.ctrlKey || e.metaKey) && (keyLower === 'z')) {
                return;
            }
            // Prevent any other Shift/Ctrl/Meta combos from triggering OS shortcuts
            if (e.ctrlKey || e.shiftKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        window.addEventListener('keydown', onGlobalKeyDown, true);
        return () => window.removeEventListener('keydown', onGlobalKeyDown, true);
    }, [mode, selected, board, originalPuzzle, disabled, focusIndex]);

    // ────────────────────────────────────────────────
    // 4) MOUSE SELECTION
    // ────────────────────────────────────────────────
    const addSelect = (idx, additive) => {
        setSelected(old => {
            // Now allow selecting givens
            if (additive) {
                const c = [...old];
                c[idx] = !old[idx];
                return c;
            } else {
                const c = Array(81).fill(false);
                c[idx] = true;
                return c;
            }
        });
    };

    const handleMouseDown = (idx, e) => {
        if (disabled) return;
        e.preventDefault();
        isMouseDown.current = true;
        addSelect(idx, e.shiftKey || e.ctrlKey);
        setFocusIndex(idx);
    };
    const handleMouseUp = () => {
        isMouseDown.current = false;
    };
    const handleMouseEnter = (idx) => {
        if (!isMouseDown.current || disabled) return;
        setSelected(old => {
            // Now allow selecting givens when dragging
            const c = [...old];
            c[idx] = true;
            return c;
        });
        setFocusIndex(idx);
    };

    // ────────────────────────────────────────────────
    // 5) INPUT HANDLING (Digit / Candidate / Center / Color / Clear)
    // ────────────────────────────────────────────────
    const handleNumpadClick = (value, appliedMode = mode) => {
        // Record history for undo
        const prevBoard = cloneBoard(board);
        setUndoStack(us => [...us, prevBoard]);
        setRedoStack([]); // clear redo on new action

        // Build the updated board
        const newBoard = board.map((cell, idx) => {
            if (!selected[idx]) return cell;
            const isGiven = originalPuzzle[idx] >= 1 && originalPuzzle[idx] <= 9;
            // If it's a given and not in color mode, do not alter
            if (isGiven && appliedMode !== 'color') return cell;
            const newCell = { ...cell };

            switch (appliedMode) {
                case 'number':
                    if (value === 0) {
                        newCell.digit = null;
                    } else {
                        newCell.digit = value;
                        newCell.candidates = [];
                        newCell.centerCands = [];
                    }
                    break;
                case 'candidate':
                    if (value === 0) {
                        newCell.candidates = [];
                    } else {
                        const has = newCell.candidates.includes(value);
                        newCell.candidates = has
                            ? newCell.candidates.filter(v => v !== value)
                            : [...newCell.candidates, value];
                        if (newCell.candidates.length) newCell.digit = null;
                    }
                    break;
                case 'center':
                    if (value === 0) {
                        newCell.centerCands = [];
                    } else {
                        const hasC = newCell.centerCands.includes(value);
                        newCell.centerCands = hasC
                            ? newCell.centerCands.filter(v => v !== value)
                            : [...newCell.centerCands, value];
                        if (newCell.centerCands.length) newCell.digit = null;
                    }
                    break;
                case 'color':
                    if (value === 0) {
                        newCell.color = null;
                    } else {
                        newCell.color = palette[(value - 1) % palette.length];
                    }
                    break;
                default:
                    break;
            }
            return newCell;
        });

        setBoard(newBoard);

        // Detect mistakes
        const mistake = detectMistake(newBoard);
        setHasMistake(mistake);

        // Immediately notify parent of the new board and mistake flag
        if (typeof onBoardChange === 'function') {
          onBoardChange(newBoard, mistake);
        }
    };

    const handleClear = () => {
        // Record history for undo
        const prevBoard = cloneBoard(board);
        setUndoStack(us => [...us, prevBoard]);
        setRedoStack([]);

        const currentSig = selected.join(',');
        // Determine if any cell has data in the active layer (for non-givens) or color (for givens)
        let anyHasCurrentLayer = false;
        for (let idx = 0; idx < 81; idx++) {
            if (!selected[idx]) continue;
            const cell = board[idx];
            const isGiven = originalPuzzle[idx] >= 1 && originalPuzzle[idx] <= 9;
            if (isGiven) {
                if (cell.color !== null) {
                    anyHasCurrentLayer = true;
                    break;
                }
                continue;
            }
            switch (mode) {
                case 'number':
                    if (cell.digit !== null) anyHasCurrentLayer = true;
                    break;
                case 'candidate':
                    if (cell.candidates.length > 0) anyHasCurrentLayer = true;
                    break;
                case 'center':
                    if (cell.centerCands.length > 0) anyHasCurrentLayer = true;
                    break;
                case 'color':
                    if (cell.color !== null) anyHasCurrentLayer = true;
                    break;
                default:
                    break;
            }
            if (anyHasCurrentLayer) break;
        }

        // Check if this is a second press on the same selection signature
        const isSecondPress = currentSig === lastClearedSignature;

        // Build the newBoard array based on whether we clear a layer or full
        const newBoard = board.map((cell, idx) => {
            if (!selected[idx]) return cell;
            const isGiven = originalPuzzle[idx] >= 1 && originalPuzzle[idx] <= 9;
            if (isGiven) {
                // For givens: only clear color, never remove digit or candidates
                if (isSecondPress) {
                    // Second press: remove color but keep given
                    return { ...cell, color: null };
                }
                // Single press: only clear color if present
                if (cell.color !== null) {
                    return { ...cell, color: null };
                }
                return cell;
            }

            // Non-given cells:
            if (!anyHasCurrentLayer) {
                // No data in current layer: full clear on these
                return { ...emptyCell };
            }
            if (isSecondPress) {
                // Second press: full clear
                return { ...emptyCell };
            }
            // Otherwise, clear only active layer
            const newCell = { ...cell };
            switch (mode) {
                case 'number':
                    if (newCell.digit !== null) newCell.digit = null;
                    break;
                case 'candidate':
                    if (newCell.candidates.length > 0) newCell.candidates = [];
                    break;
                case 'center':
                    if (newCell.centerCands.length > 0) newCell.centerCands = [];
                    break;
                case 'color':
                    if (newCell.color !== null) newCell.color = null;
                    break;
                default:
                    break;
            }
            return newCell;
        });

        setBoard(newBoard);
        if (isSecondPress) {
            setLastClearedSignature(null);
        } else {
            setLastClearedSignature(currentSig);
        }

        // Detect mistakes
        const mistake = detectMistake(newBoard);
        setHasMistake(mistake);
        if (typeof onBoardChange === 'function') {
          onBoardChange(newBoard, mistake);
        }
    };

    // ────────────────────────────────────────────────
    // Undo/Redo functions
    // ────────────────────────────────────────────────
    const undo = () => {
        if (undoStack.length === 0) return;
        const last = undoStack[undoStack.length - 1];
        const prevUndo = undoStack.slice(0, -1);
        setUndoStack(prevUndo);
        setRedoStack(rs => [...rs, cloneBoard(board)]);
        setBoard(last);
        const mistakeUndo = detectMistake(last);
        setHasMistake(mistakeUndo);
        if (typeof onBoardChange === 'function') {
          onBoardChange(last, mistakeUndo);
        }
    };
    const redo = () => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        const prevRedo = redoStack.slice(0, -1);
        setRedoStack(prevRedo);
        setUndoStack(us => [...us, cloneBoard(board)]);
        setBoard(next);
        const mistakeRedo = detectMistake(next);
        setHasMistake(mistakeRedo);
        if (typeof onBoardChange === 'function') {
          onBoardChange(next, mistakeRedo);
        }
    };

    // ────────────────────────────────────────────────
    // Keyboard shortcuts for undo/redo
    // ────────────────────────────────────────────────
    useEffect(() => {
        const onKeyDown = (e) => {
            if (disabled) return;
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undo();
            } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                redo();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [undoStack, redoStack, board, mode, disabled]);

    // ────────────────────────────────────────────────
    // 6) DRAW SELECTION BORDER
    // ────────────────────────────────────────────────
    const getSelectionClasses = (idx) => {
        if (!selected[idx]) return '';
        const row = Math.floor(idx / 9), col = idx % 9;
        const top = row === 0 || !selected[idx - 9];
        const left = col === 0 || !selected[idx - 1];
        const right = col === 8 || !selected[idx + 1];
        const bottom = row === 8 || !selected[idx + 9];

        return [top && 'border-t-4', left && 'border-l-4', right && 'border-r-4', bottom && 'border-b-4']
            .filter(Boolean)
            .map(side => `${side} border-blue-400`)
            .join(' ');
    };

    // ────────────────────────────────────────────────
    // Helper: Check if a value conflicts in the same row, col, or box
    // idx: cell index (0-80), value: digit (1–9)
    function hasConflict(idx, value) {
        if (!value) return false;
        const row = Math.floor(idx / 9);
        const col = idx % 9;
        const boxRow = Math.floor(row / 3);
        const boxCol = Math.floor(col / 3);
        for (let i = 0; i < 81; i++) {
            if (i === idx) continue;
            const otherCell = board[i];
            const otherVal =
                (originalPuzzle[i] >= 1 && originalPuzzle[i] <= 9)
                    ? originalPuzzle[i]
                    : otherCell.digit;
            if (otherVal !== value) continue;
            const r = Math.floor(i / 9);
            const c = i % 9;
            if (r === row || c === col || (Math.floor(r / 3) === boxRow && Math.floor(c / 3) === boxCol)) {
                return true;
            }
        }
        return false;
    }

    // ────────────────────────────────────────────────
    // 7) RENDER
    // ────────────────────────────────────────────────
    return (
        <div className="flex items-center justify-center">
            {/* Container to control board dimensions */}
            <div style={{ width: boardSize, height: boardSize }} className="flex flex-row">
                {/* ======= SUDOKU GRID ======= */}
                <div
                    className={`grid grid-cols-9 grid-rows-9 select-none border-4 ${disabled ? 'opacity-50' : ''}`}
                    style={{ width: '100%', height: '100%' }}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {board.map((cell, index) => {
                        const row = Math.floor(index / 9), col = index % 9;

                        // 3×3 thicker boundaries
                        let borderClasses = '';
                        if (col === 2 || col === 5) borderClasses += ' border-r-4';
                        else if (col !== 8) borderClasses += ' border-r';
                        if (row === 2 || row === 5) borderClasses += ' border-b-4';
                        else if (row !== 8) borderClasses += ' border-b';

                        const isGiven = originalPuzzle[index] >= 1 && originalPuzzle[index] <= 9;
                        const displayDigit = isGiven
                            ? originalPuzzle[index]
                            : cell.digit;

                        // Always white background
                        const bgClass = 'bg-white';

                        // For center candidates, precompute sorted array
                        const sortedCenterCands = cell.centerCands.slice().sort((a, b) => a - b);

                        return (
                            <div
                                key={index}
                                className={`relative w-full h-full ${bgClass} ${borderClasses} hover:bg-blue-100 cursor-pointer`}
                                onMouseDown={(e) => handleMouseDown(index, e)}
                                onMouseEnter={() => handleMouseEnter(index)}
                                onContextMenu={(e) => e.preventDefault()}
                            >
                                {/* 1) Color background */}
                                {cell.color && (
                                    <div
                                        className="absolute inset-0 opacity-50"
                                        style={{ backgroundColor: cell.color }}
                                    />
                                )}

                                {/* 2) Selection border */}
                                {selected[index] && (
                                    <div
                                        className={`absolute inset-0 pointer-events-none ${getSelectionClasses(index)}`}
                                    />
                                )}

                                {/* 3) Digit layer */}
                                {displayDigit && (
                                    <div
                                        className={`absolute inset-0 flex items-center justify-center text-3xl font-bold ${hasConflict(index, displayDigit)
                                            ? 'text-red-600'
                                            : isGiven
                                                ? 'text-gray-900'
                                                : 'text-blue-600'
                                            } z-10`}
                                    >
                                        {displayDigit}
                                    </div>
                                )}

                                {/* 4) Small candidate grid */}
                                {!displayDigit && cell.candidates.length > 0 && (
                                    <div className="absolute top-0 left-0 w-full h-full p-0.5 grid grid-cols-3 grid-rows-3 text-[12px] text-black z-5">
                                        {Array.from({ length: 9 }).map((_, i) => {
                                            const num = i + 1;
                                            const show = cell.candidates.includes(num);
                                            const conflict = show && hasConflict(index, num);
                                            return (
                                                <div
                                                    key={i}
                                                    className={`flex items-center justify-center ${show ? '' : 'invisible'
                                                        }${conflict ? ' text-red-600' : ''}`}
                                                >
                                                    {num}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* 5) Center candidates (if any) */}
                                {!displayDigit && cell.centerCands.length > 0 && (
                                    <div className="absolute inset-0 flex flex-wrap items-center justify-center text-m text-black z-5 font-bold opacity-60 p-1">
                                        {sortedCenterCands.map((num, i) => {
                                            const conflict = hasConflict(index, num);
                                            return (
                                                <span
                                                    key={i}
                                                    className={conflict ? 'text-red-600' : undefined}
                                                    style={{ margin: '0 2px' }}
                                                >
                                                    {num}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ======= RIGHT‐HAND PANEL ======= */}
            <div className="ml-6 flex flex-col">
                {/* Mode Buttons */}
                <div className="flex flex-col space-y-2 mb-4">
                    {['number', 'candidate', 'center', 'color'].map(m => (
                        <button
                            key={m}
                            onClick={() => {
                                if (disabled) return;
                                setMode(m);
                            }}
                            className={`px-3 py-1 border rounded ${mode === m
                                ? 'bg-gray-200 border-gray-500'
                                : 'bg-white border-gray-300 hover:bg-gray-100'
                                }`}
                        >
                            {m.charAt(0).toUpperCase() + m.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Numpad or Colorpad */}
                <div className="grid grid-cols-3 gap-2">
                    {mode === 'color'
                        ? palette.map((col, i) => (
                            <button
                                key={i}
                                disabled={disabled}
                                onClick={() => handleNumpadClick(i + 1, 'color')}
                                className="w-14 h-14 cursor-pointer rounded-lg flex items-center justify-center hover:brightness-90"
                                style={{ backgroundColor: col }}
                                aria-label={`Color ${i + 1}`}
                            />
                        ))
                        : Array.from({ length: 9 }).map((_, i) => (
                            <button
                                key={i}
                                disabled={disabled}
                                onClick={() => handleNumpadClick(i + 1, mode)}
                                className="w-14 h-14 bg-black border-2 font-bold cursor-pointer text-white rounded-lg flex items-center justify-center hover:bg-white hover:text-black transition-colors"
                            >
                                {i + 1}
                            </button>
                        ))}
                    <button
                        onClick={handleClear}
                        disabled={disabled}
                        className="col-span-3 w-full h-10 bg-red-500 text-white rounded-lg flex items-center justify-center hover:bg-red-600 cursor-pointer"
                    >
                        Clear
                    </button>
                    <div className="col-span-3 flex justify-between mt-2">
                        <button
                            onClick={undo}
                            disabled={disabled || undoStack.length === 0}
                            className={`w-1/2 mx-1 h-10 text-4xl border rounded-lg flex items-center justify-center transition-colors ${disabled || undoStack.length === 0
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-white text-black hover:bg-black hover:text-white'
                                }`}
                            title="Undo"
                        >
                            &#8617;
                        </button>
                        <button
                            onClick={redo}
                            disabled={disabled || redoStack.length === 0}
                            className={`w-1/2 mx-1 h-10 text-4xl border rounded-lg flex items-center justify-center transition-colors ${disabled || redoStack.length === 0
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-white text-black hover:bg-black hover:text-white'
                                }`}
                            title="Redo"
                        >
                            &#8618;
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SudokuGrid;