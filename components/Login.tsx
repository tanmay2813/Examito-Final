import React, { useState, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { getInitialUserProfile } from '../services/localStorageService';

const Login: React.FC = () => {
    const { setUserProfile } = useContext(AppContext);
    const [name, setName] = useState('');
    const [board, setBoard] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() && board.trim()) {
            const newProfile = getInitialUserProfile(name, board);
            setUserProfile(newProfile);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-green-600 dark:text-green-400">Welcome to Examito</h1>
                <p className="text-center text-gray-600 dark:text-gray-300">Let's get your personalized learning journey started.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">What's your name?</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 mt-1 text-gray-800 bg-gray-50 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                            placeholder="e.g., Alex Doe"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="board" className="text-sm font-medium text-gray-700 dark:text-gray-300">What's your academic board/curriculum?</label>
                        <input
                            id="board"
                            type="text"
                            value={board}
                            onChange={(e) => setBoard(e.target.value)}
                            className="w-full px-4 py-3 mt-1 text-gray-800 bg-gray-50 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                            placeholder="e.g., CBSE, IGCSE, High School"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-xl shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-transform transform hover:scale-105"
                    >
                        Start Learning
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;