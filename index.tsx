import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Apply theme based on saved preference or system setting
const theme = localStorage.getItem('examito-theme');
if (theme === 'dark' || (!theme && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
} else {
    document.documentElement.classList.remove('dark');
}


const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error('Root element not found. Make sure you have a <div id="root"></div> in your index.html');
}