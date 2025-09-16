
import React, { useContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { View } from '../types';
import { AppContext } from '../contexts/AppContext';

import { DashboardIcon } from './icons/DashboardIcon';
import { TutorIcon } from './icons/TutorIcon';
import { TestIcon } from './icons/TestIcon';
import { ReportIcon } from './icons/ReportIcon';
import { TimelineIcon } from './icons/TimelineIcon';
import { FlashcardIcon } from './icons/FlashcardIcon';
import { AchievementIcon } from './icons/AchievementIcon';


interface SidebarProps {
    activeView: View;
    setActiveView: Dispatch<SetStateAction<View>>;
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, setIsOpen }) => {
    const { userProfile, setUserProfile } = useContext(AppContext);

    const navItems = [
        { view: View.DASHBOARD, label: 'Dashboard', icon: DashboardIcon },
        { view: View.TUTOR, label: 'AI Tutor', icon: TutorIcon },
        { view: View.TESTS, label: 'Tests & Challenges', icon: TestIcon },
        { view: View.FLASHCARDS, label: 'Flashcards', icon: FlashcardIcon },
        { view: View.REPORTS, label: 'Reports', icon: ReportIcon },
        { view: View.TIMELINE, label: 'Timeline', icon: TimelineIcon },
        { view: View.ACHIEVEMENTS, label: 'Achievements', icon: AchievementIcon },
    ];
    
    const handleLogout = () => {
        if(window.confirm('Are you sure you want to logout? This will clear your data.')) {
            if (setUserProfile) setUserProfile(null);
        }
    }
    
    const handleNavItemClick = (view: View) => {
        setActiveView(view);
        setIsOpen(false); // Close sidebar on navigation in mobile
    };


    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            ></div>
            <aside className={`w-64 bg-white dark:bg-gray-800 flex flex-col shadow-lg fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h1 className="text-3xl font-extrabold text-green-600 dark:text-green-400">Examito</h1>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Built by Tanmay Garg and Saanvi Jha</p>
                    <p className="text-md text-gray-600 dark:text-gray-400 mt-4">Welcome, {userProfile?.name}!</p>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map(item => {
                        const isActive = activeView === item.view;
                        return (
                            <button
                                key={item.view}
                                onClick={() => handleNavItemClick(item.view)}
                                className={`w-full flex items-center p-3 rounded-xl text-left transition-colors duration-200 ${
                                    isActive 
                                    ? 'bg-green-500 text-white shadow-md' 
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                            >
                                <item.icon className={`mr-4 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                                <span className="font-semibold">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                     <button 
                        onClick={handleLogout}
                        className="w-full bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors duration-200"
                    >
                        Logout & Reset
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;