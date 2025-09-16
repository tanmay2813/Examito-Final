

import React, { useState, useEffect, useContext } from 'react';
import { AppProvider } from './contexts/AppProvider';
import { AppContext } from './contexts/AppContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AdaptiveTutor from './components/AdaptiveTutor';
import TestAndChallengeGenerator from './components/TestAndChallengeGenerator';
import ProgressReports from './components/ProgressReports';
import Timeline from './components/Timeline';
import Login from './components/Login';
import Flashcards from './components/Flashcards';
import Achievements from './components/Achievements';
import { View } from './types';
import { Toaster } from 'react-hot-toast';

const AppContent: React.FC = () => {
    const { userProfile, loading, apiKeyOk } = useContext(AppContext);
    const [activeView, setActiveView] = useState<View>(View.DASHBOARD);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const renderView = () => {
        switch (activeView) {
            case View.DASHBOARD:
                return <Dashboard setActiveView={setActiveView} />;
            case View.TUTOR:
                return <AdaptiveTutor />;
            case View.TESTS:
                return <TestAndChallengeGenerator />;
            case View.REPORTS:
                return <ProgressReports />;
            case View.TIMELINE:
                return <Timeline />;
            case View.FLASHCARDS:
                return <Flashcards />;
            case View.ACHIEVEMENTS:
                return <Achievements />;
            default:
                return <Dashboard setActiveView={setActiveView} />;
        }
    };

    if (!apiKeyOk) {
        return (
            <div className="flex items-center justify-center h-screen bg-red-50 dark:bg-gray-900 p-4">
                <div className="w-full max-w-lg p-8 text-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-red-500">
                    <div className="text-5xl mb-4">🚫</div>
                    <h1 className="text-3xl font-extrabold text-red-600 dark:text-red-400">Configuration Error</h1>
                    <p className="mt-4 text-gray-600 dark:text-gray-300">
                        The application is not configured correctly. The required API key for the AI service is missing.
                    </p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        Please contact the administrator or check the deployment environment variables to resolve this issue.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">Loading Examito...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex">
            {userProfile ? (
                <>
                    <Sidebar activeView={activeView} setActiveView={setActiveView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                    <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                         <button
                            className="md:hidden p-2 mb-4 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Open sidebar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        {renderView()}
                    </main>
                </>
            ) : (
                <Login />
            )}
            <Toaster position="bottom-right" />
        </div>
    );
};

const App: React.FC = () => (
    <AppProvider>
        <AppContent />
    </AppProvider>
);

export default App;