import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Apply dark mode based on system preference to match the app's styling
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
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
