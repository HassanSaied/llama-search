// src/pages/SearchPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function SearchPage() {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    // A single handler for both search types
    const handleSearch = (searchType: 'standard' | 'academic') => {
        if (query.trim()) {
            const encodedQuery = encodeURIComponent(query.trim());
            if (searchType === 'academic') {
                // Navigate to the same results page but add a parameter to specify the search type
                navigate(`/results?q=${encodedQuery}&type=academic`);
            } else {
                navigate(`/results?q=${encodedQuery}`);
            }
        }
    };

    // Allows users to press Enter to initiate a standard search
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch('standard');
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '80vh', // Use viewport height to help with vertical centering
            width: '100vw' // <-- ADD THIS LINE
        }}>
            {/* 1. Placeholder for your icon/logo */}
            <div style={{ marginBottom: '20px', fontSize: '2em', fontWeight: 'bold' }}>
                <img
                    src="/search-337.svg"
                    alt="Search Engine Logo"
                    style={{ height: '92px', marginBottom: '20px' }}
                />
            </div>

            {/* Main search input */}
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="What are you looking for?"
                style={{
                    width: '580px',
                    padding: '12px 20px',
                    borderRadius: '24px', // Rounded corners
                    border: '1px solid #dfe1e5',
                    fontSize: '16px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)' // Subtle shadow
                }}
            />

            {/* 2. Container for the two search buttons */}
            <div style={{ marginTop: '20px' }}>
                <button
                    onClick={() => handleSearch('standard')}
                    style={{ padding: '10px 16px', margin: '0 8px', border: '1px solid transparent', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Search
                </button>
                <button
                    onClick={() => handleSearch('academic')}
                    style={{ padding: '10px 16px', margin: '0 8px', border: '1px solid transparent', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Academic Search
                </button>
            </div>
        </div>
    );
}