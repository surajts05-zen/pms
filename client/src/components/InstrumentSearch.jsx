import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader, X } from 'lucide-react';
import api from '../services/api';

const InstrumentSearch = ({ onSelect, selectedInstrumentId, instruments = [], types = [] }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    // Initial value setup
    useEffect(() => {
        if (selectedInstrumentId && instruments.length > 0) {
            const selected = instruments.find(i => i.id === selectedInstrumentId);
            if (selected) {
                setQuery(selected.ticker + ' - ' + selected.name);
            }
        } else if (!selectedInstrumentId) {
            setQuery('');
        }
    }, [selectedInstrumentId, instruments]);

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSearch = async (value) => {
        setQuery(value);

        // If the user starts typing, invalidate previous selection
        // unless they are just backspacing a bit but still matching? 
        // Safer to invalidate to force re-selection.
        if (selectedInstrumentId) {
            onSelect(null);
        }

        if (value.length < 2) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setLoading(true);
        setIsOpen(true);
        try {
            let url = `/instruments/search?q=${value}`;
            if (types.length > 0) {
                url += `&types=${types.join(',')}`;
            }
            const res = await api.get(url);
            setResults(res.data);
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
        onSelect(null);
    };

    const handleSelect = async (item) => {
        if (item.source === 'remote') {
            // Create the instrument first
            try {
                setLoading(true);
                const payload = {
                    ticker: item.ticker,
                    name: item.name,
                    type: 'stock', // Defaulting to stock for now
                    category: 'aspiration', // Defaulting
                    currentPrice: 0
                };
                const res = await api.post('/instruments', payload);
                onSelect(res.data); // Return the full new instrument
                setQuery(res.data.ticker + ' - ' + res.data.name);
                setIsOpen(false);
            } catch (err) {
                console.error("Failed to create instrument", err);
                alert("Failed to add new instrument: " + err.message);
            } finally {
                setLoading(false);
            }
        } else {
            // Local instrument
            onSelect(item);
            setQuery(item.ticker + ' - ' + item.name);
            setIsOpen(false);
        }
    };

    return (
        <div className="instrument-search" ref={wrapperRef} style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => { if (results.length > 0) setIsOpen(true); }}
                    placeholder="Search scrip (e.g. RELIANCE)..."
                    style={{ width: '100%', paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                    className="filter-input"
                />
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />

                {query && !loading && (
                    <div
                        onClick={handleClear}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-muted)' }}
                    >
                        <X size={16} />
                    </div>
                )}

                {loading && (
                    <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
                        <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid var(--text-muted)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    </div>
                )}
            </div>

            {isOpen && results.length > 0 && (
                <ul style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--card-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    listStyle: 'none',
                    marginTop: '0.25rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}>
                    {results.map((item, idx) => (
                        <li
                            key={item.id || item.ticker + idx}
                            onClick={() => handleSelect(item)}
                            style={{
                                padding: '0.75rem 1rem',
                                cursor: 'pointer',
                                borderBottom: idx === results.length - 1 ? 'none' : '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <div>
                                <div style={{ fontWeight: '600' }}>{item.ticker}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.name}</div>
                            </div>
                            {item.source === 'remote' && (
                                <span style={{ fontSize: '0.7rem', background: 'var(--primary)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>NEW</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <style>{`
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default InstrumentSearch;
