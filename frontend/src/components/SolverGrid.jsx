// frontend/src/components/SudokuGrid.jsx

import styles from './SolverGrid.module.css';

const SolverGrid = ({
    puzzle,
    originalPuzzle,
    onChange,
    mode = 'number',            // 'number' or 'candidate'
    highlightedTechCells = Array(81).fill(0),
    highlightedRemovals = Array(81).fill(0),
    highlightedAdditions = Array(81).fill(0),
    disabled = false,
}) => {
    
    const toggleHidden = (cellIdx, digit) => {
        const newPuzzle = puzzle.slice();
        if (Array.isArray(newPuzzle[cellIdx])) {
            const index = newPuzzle[cellIdx].indexOf(digit);
            if (index > -1) {
                newPuzzle[cellIdx].splice(index, 1);
            } else {
                newPuzzle[cellIdx].push(digit);
            }
        } else {
            newPuzzle[cellIdx] = [digit];
        }
        onChange(cellIdx, newPuzzle[cellIdx]);
    };

    const renderCell = (val, index) => {
        const isOrig = typeof originalPuzzle[index] === 'number' || disabled;
        const isHighlighted = highlightedTechCells[index] === 1 || highlightedAdditions[index] === 1;
        // a removed candidate is held in the array as {index, value} where index is the cell index and value is the candidate
        const isRemoved = (index, value) => highlightedRemovals.filter(c => c.index === index && c.value === value).length > 0;

        // Always render an input for the cell
        const displayVal = typeof val === 'number' ? val : '';
        return (
            <td
                key={index}
                className={`
                  ${styles['cell-wrapper']}
                  ${isOrig        ? styles.original    : ''}
                  ${isHighlighted ? styles.highlighted : ''}
                `}
            >
                <input
                    className={`
                      ${styles.cell}
                      ${isOrig        ? styles.original    : ''}
                      ${isHighlighted ? styles.highlighted : ''}
                    `}
                    type="text"
                    maxLength={1}
                    value={displayVal}
                    disabled={true}
                    onChange={e => {
                        let v = e.target.value;
                        if (/^[1-9]$/.test(v) || v === '') onChange(index, v);
                    }}
                    onFocus={e => e.target.select()}
                    onMouseUp={e => e.preventDefault()}
                    id={`cell-${index}`}
                />
                {/* Candidates overlay always visible */}
                {Array.isArray(val) && val.length > 0 && (
                    <div
                        className={styles['candidate-cell']}
                        style={{ pointerEvents: mode === 'candidate' ? 'auto' : 'none' }}
                    >
                        <div className={styles['candidates-grid']}>
                            {Array.from({ length: 9 }, (_, i) => {
                                const digit = i + 1;
                                const isCandidate = val.includes(digit);
                                const classes = [styles['candidate-digit']];
                                if (isRemoved(index, digit))      classes.push(styles['removed-candidate']);
                                else if (!isCandidate)            classes.push(styles.hidden);
                                return (
                                    <div
                                        key={i}
                                        className={classes.join(' ')}
                                        // show pointer cursor on candidate spans
                                        style={{ cursor: mode === 'candidate' ? 'pointer' : 'default' }}
                                        onClick={mode === 'candidate' ? () => toggleHidden(index, digit) : undefined}
                                    >
                                        {digit}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </td>
        );
    };

    return (
        <table
            className={styles['sudoku-table']}
            key={`table-${puzzle.join('')}`}
        >
            <colgroup><col /><col /><col /></colgroup>
            <colgroup><col /><col /><col /></colgroup>
            <colgroup><col /><col /><col /></colgroup>
            {Array.from({ length: 3 }).map((_, section) => (
                <tbody key={section}>
                    {Array.from({ length: 3 }).map((_, rowOffset) => {
                        const row = section * 3 + rowOffset;
                        return (
                            <tr key={row}>
                                {Array.from({ length: 9 })
                                    .map((_, col) => {
                                        const index = row * 9 + col;
                                        return renderCell(puzzle[index], index);
                                    })}
                            </tr>
                        );
                    })}
                </tbody>
            ))}
        </table>
    );
};

export default SolverGrid;