
import React, { useState, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';

const ApiKeyPrompt: React.FC = () => {
    const { setApiKey } = useContext(AppContext);
    const [key, setKey] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (key.trim() && setApiKey) {
            setApiKey(key.trim());
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="w-full max-w-lg p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg text-center">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-green-600 dark:text-green-400">Welcome to Examito</h1>
                <p className="text-gray-600 dark:text-gray-300">
                    To get started, please enter your Google AI API key. Your key will be stored securely in your browser session and will not be shared.
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="api-key" className="sr-only">Google AI API Key</label>
                        <input
                            id="api-key"
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            className="w-full px-4 py-3 text-gray-800 bg-gray-50 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                            placeholder="Enter your API key"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-xl shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-105"
                    >
                        Save and Continue
                    </button>
                </form>
                 <p className="text-xs text-gray-500 dark:text-gray-400 pt-4">
                    You can get an API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline">Google AI Studio</a>.
                </p>
            </div>
        </div>
    );
};

export default ApiKeyPrompt;
