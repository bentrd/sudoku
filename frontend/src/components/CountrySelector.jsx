import React, { useState, useRef, useEffect } from 'react';
import isoCountries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

// Register English locale for country names
isoCountries.registerLocale(enLocale);

// Utility: convert ISO country code to emoji flag
const codeToFlag = (countryCode) =>
    countryCode
        .toUpperCase()
        .split('')
        .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
        .join('');

// Build list of all countries once
const allCountries = Object.entries(
    isoCountries.getNames('en', { select: 'official' })
)
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

/**
 * CountrySelector
 * A searchable combobox. Props:
 *  - value: current country code
 *  - onChange: fn(code:string) => void
 *  - disabled: boolean
 */
const CountrySelector = ({ value, onChange, disabled = false }) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [highlightIndex, setHighlightIndex] = useState(0);
    const containerRef = useRef();

    // Filter options by input
    const options = allCountries.filter(({ name, code }) =>
        name.toLowerCase().includes(inputValue.toLowerCase()) ||
        code.toLowerCase().includes(inputValue.toLowerCase())
    );

    // Close on outside click
    useEffect(() => {
        const onClick = (e) => {
            if (!containerRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    // When value prop changes, update inputValue
    useEffect(() => {
        const sel = allCountries.find((c) => c.code === value);
        setInputValue(sel ? sel.name : '');
    }, [value]);

    const selectOption = (opt) => {
        onChange(opt.code);
        setOpen(false);
    };

    const onInputKeyDown = (e) => {
        if (!open) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex((hi) => Math.min(hi + 1, options.length - 1));
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex((hi) => Math.max(hi - 1, 0));
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            selectOption(options[highlightIndex]);
        }
        if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <input
                type="text"
                className="w-full bg-white rounded-full border border-gray-300 shadow-sm px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={disabled}
                placeholder="Select country"
                value={inputValue}
                onClick={() => !disabled && setOpen(true)}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    setOpen(true);
                    setHighlightIndex(0);
                }}
                onKeyDown={onInputKeyDown}
            />
            {/* Dropdown arrow */}
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg
                    className="w-4 h-4 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
            {open && (
                <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto bg-white border border-gray-300 rounded-lg shadow-lg">
                    {options.length === 0 && (
                        <li className="px-4 py-2 text-gray-500">No matches</li>
                    )}
                    {options.map((opt, idx) => (
                        <li
                            key={opt.code}
                            className={`flex items-center px-4 py-2 text-sm cursor-pointer 
                ${idx === highlightIndex ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                            onMouseEnter={() => setHighlightIndex(idx)}
                            onClick={() => selectOption(opt)}
                        >
                            <span className="mr-2">{codeToFlag(opt.code)}</span>
                            {opt.name}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default CountrySelector;