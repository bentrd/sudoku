import React from "react";

export function Techniques({
    difficulty,
    listRef,
    techniques,
    setStepIndex,
    stepIndex
}) {
    return <div style={{
        width: '250px',
        marginLeft: '1rem',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '500px'
    }}>
        {difficulty && <>
            <div style={{
                padding: '0.5rem'
            }}>
                <p>Difficulty Score: {difficulty.score}</p>
                <p>Category: {difficulty.name}</p>
                <h3>Techniques Used:</h3>
            </div>
            <ul ref={listRef} style={{
                overflowY: 'scroll',
                margin: 0,
                padding: '0 0.5rem',
                border: '1px solid #ccc'
            }}>
                {techniques.map((t, i) => <li key={i} onClick={() => setStepIndex(i)} style={{
                    fontWeight: i === stepIndex ? 'bold' : 'normal',
                    cursor: 'pointer',
                    textDecoration: i === stepIndex ? 'underline' : 'none',
                    marginBottom: '0.25em'
                }}>
                    {t.name}
                </li>)}
            </ul>
        </>}
    </div>;
}
