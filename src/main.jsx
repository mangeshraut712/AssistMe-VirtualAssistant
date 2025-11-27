import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import BenchmarkPage from './pages/BenchmarkPage';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<App />} />
                    <Route path="/benchmark" element={<BenchmarkPage />} />
                </Routes>
            </BrowserRouter>
        </ErrorBoundary>
    </React.StrictMode>
);
