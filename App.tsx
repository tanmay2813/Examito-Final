


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
import Store from './components/Store';
import StudyPlanner from './components/StudyPlanner';
import StudyZone from './components/StudyZone';
import { View } from './types';
import { Toaster } from 'react-hot-toast';

const AppContent: React.FC = () => {
    const { userProfile, loading } = useContext(AppContext);
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
            case View.STORE:
                return <Store />;
            case View.STUDY_PLAN:
                return <StudyPlanner />;
            case View.STUDY_ZONE:
                return <StudyZone />;
            default:
                return <Dashboard setActiveView={setActiveView} />;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-200">Loading Examito...</div>
            </div>
        );
    }
    
    return (
        <div className="h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex overflow-hidden">
            {userProfile ? (
                <>
                    <Sidebar activeView={activeView} setActiveView={setActiveView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
                    <main className={`flex-1 p-4 md:p-6 flex flex-col ${activeView === View.TUTOR ? 'overflow-y-hidden' : 'overflow-y-auto'}`}>
                         <button
                            className="md:hidden p-2 mb-4 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Open sidebar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div className="flex-1 min-h-0">
                            {renderView()}
                        </div>
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