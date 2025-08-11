// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SearchPage } from './pages/searchPage.tsx';
import { ResultsPage } from './pages/ResultsPage';

function App() {
    return (
        <BrowserRouter>
            <div style={{ padding: '20px' }}>
                <Routes>
                    <Route path="/" element={<SearchPage />} />
                    <Route path="/results" element={<ResultsPage />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;