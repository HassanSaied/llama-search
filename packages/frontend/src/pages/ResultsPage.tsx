// src/pages/ResultsPage.tsx
import  { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { type UserQuery} from '@llama-search/types';
import { type LlmSearchResults } from '@llama-search/types';

// Define types for the chat feature
type ChatMessage = {
    sender: 'user' | 'bot';
    text: string;
};
// ++ CHATBOX COMPONENT ++
// This new component encapsulates the chat functionality.
const ChatBox = ({ initialQuery }: { initialQuery: string }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim()) return;

        const userMessage: ChatMessage = { sender: 'user', text: userInput };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            // Send the initial search query, chat history, and new message to the server
            const response = await fetch('http://localhost:3000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: initialQuery,
                    message: userInput,
                    history: [...messages, userMessage], // Send the up-to-date history
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const responseData = await response.json();
            const botMessage: ChatMessage = { sender: 'bot', text: responseData.response };
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            const botError: ChatMessage = { sender: 'bot', text: `Sorry, something went wrong: ${errorMessage}` };
            setMessages(prev => [...prev, botError]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ marginTop: '40px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
            <h2>Chat about these results</h2>
            {/* Message display area */}
            <div style={{ height: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px', marginBottom: '10px', borderRadius: '8px' }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{
                        textAlign: msg.sender === 'user' ? 'right' : 'left',
                        marginBottom: '10px',
                    }}>
                        <span style={{
                            backgroundColor: msg.sender === 'user' ? '#007bff' : '#e9ecef',
                            color: msg.sender === 'user' ? 'white' : 'black',
                            padding: '8px 12px',
                            borderRadius: '15px',
                            display: 'inline-block',
                            maxWidth: '70%',
                        }}>
                            {msg.text}
                        </span>
                    </div>
                ))}
                {isLoading && <p style={{ textAlign: 'left', fontStyle: 'italic', color: '#666' }}>Bot is typing...</p>}
            </div>
            {/* Input form */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex' }}>
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ask a follow-up question..."
                    disabled={isLoading}
                    style={{ flex: 1, padding: '10px', borderRadius: '5px 0 0 5px', border: '1px solid #ccc' }}
                />
                <button type="submit" disabled={isLoading} style={{ padding: '10px 15px', borderRadius: '0 5px 5px 0', border: '1px solid #007bff', backgroundColor: '#007bff', color: 'white' }}>
                    Send
                </button>
            </form>
        </div>
    );
};


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
                    ? 'http://localhost:3000/process-academic-query'
                    : 'http://localhost:3000/process-query';

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

                    {/* ++ RENDER THE CHATBOX ++ */}
                    {/* It only appears after the initial results are loaded. */}
                    {/*<ChatBox initialQuery={data.query} />*/}

                </div>
            )}
        </div>
    );
}