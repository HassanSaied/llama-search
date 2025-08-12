// src/pages/ResultsPage.tsx
import  { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { type UserQuery} from '@llama-search/types';
import { type LlmSearchResults } from '@llama-search/types';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export function ResultsPage() {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q');
    // 1. Read the new 'type' parameter from the URL
    const searchType = searchParams.get('type');

    const [data, setData] = useState<LlmSearchResults | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!query) return;

        const fetchResults = async () => {
            setData(null);
            setLoading(true);
            setError(null);

            try {
                const requestBody : UserQuery = {
                    query: query,
                    result_count: 10,
                };

                // 2. Determine the correct endpoint based on searchType
                const endpoint = searchType === 'academic'
                    ? `${API_BASE_URL}/process-academic-query`
                    : `${API_BASE_URL}/process-query`;

                // Use the selected endpoint in the fetch call
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const responseData: {result : LlmSearchResults} = await response.json();
                setData(responseData.result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
        // Add searchType to the dependency array to re-fetch if it changes
    }, [query, searchType]);

    return (
        // ... The rest of your JSX remains the same
        <div>
            <Link to="/">← New Search</Link>

            {loading && <p>Searching...</p>}
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            {data && (
                <div>
                    <h1 style={{ marginTop: '20px' }}>Results for "{data.query}"</h1>

                    <h2>Overall Summary</h2>
                    <p style={{ fontStyle: 'italic', borderLeft: '3px solid #ccc', paddingLeft: '10px' }}>
                        {data.summary}
                    </p>

                    <h2>Sources</h2>
                    <div>
                        {(data.sources || []).map((source) => (
                            <div key={source.url} style={{ marginBottom: '20px' }}>
                                <a href={source.url} target="_blank" rel="noopener noreferrer">
                                    <h3>{source.title}</h3>
                                </a>
                                <p>{source.summary}</p>
                                <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.9em', color: '#006621' }}>
                                    {source.url}
                                </a>
                            </div>
                        ))}
                    </div>

                </div>
            )}
        </div>
    );
}