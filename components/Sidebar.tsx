


import React, { useContext, useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { View } from '../types';
import { AppContext } from '../contexts/AppContext';

import { HomeIcon } from './icons/HomeIcon';
import { TutorIcon } from './icons/TutorIcon';
import { ReviewIcon } from './icons/ReviewIcon';
import { TestIcon } from './icons/TestIcon';
import { TrackIcon } from './icons/TrackIcon';
import { StoreIcon } from './icons/StoreIcon';


interface SidebarProps {
    activeView: View;
    setActiveView: Dispatch<SetStateAction<View>>;
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    openCommandCenter: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isOpen, setIsOpen, openCommandCenter }) => {
    const { userProfile, setUserProfile } = useContext(AppContext);
    const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const root = window.document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('examito-theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('examito-theme', 'light');
        }
    }, [isDarkMode]);

    const navItems = [
        { view: View.HOME, label: 'Home', icon: HomeIcon },
        { view: View.LEARN, label: 'Learn', icon: TutorIcon },
        { view: View.REVIEW, label: 'Review', icon: ReviewIcon },
        { view: View.PRACTICE, label: 'Practice', icon: TestIcon },
        { view: View.TRACK, label: 'Track', icon: TrackIcon },
        { view: View.STORE, label: 'Store', icon: StoreIcon },
    ];
    
    const handleLogout = () => {
        if(window.confirm('Are you sure you want to logout and reset your progress?')) {
            if (setUserProfile) setUserProfile(null);
        }
    }
    
    const handleNavItemClick = (view: View) => {
        setActiveView(view);
        setIsOpen(false); // Close sidebar on navigation in mobile
    };
    
    const level = userProfile ? Math.floor(userProfile.XP / 100) : 0;
    const xpForCurrentLevel = level * 100;
    const xpForNextLevel = (level + 1) * 100;
    const xpProgress = userProfile ? ((userProfile.XP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100 : 0;


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
                </div>

                <div className="p-4 space-y-4">
                     <p className="text-lg text-gray-700 dark:text-gray-300 font-semibold">Welcome, {userProfile?.name}!</p>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                            <span className="font-bold">Level: {level}</span>
                            <span className="font-bold text-green-500">{userProfile?.XP} / {xpForNextLevel} XP</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div 
                                className="bg-green-500 h-2.5 rounded-full progress-bar-inner" 
                                style={{ width: `${xpProgress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <button onClick={openCommandCenter} className="w-full flex items-center p-3 mb-2 rounded-xl text-left bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                        Command...
                        <span className="ml-auto text-xs border border-gray-300 dark:border-gray-500 rounded px-1.5 py-0.5">⌘K</span>
                    </button>
                    {navItems.map(item => {
                        const isActive = activeView === item.view;
                        return (
                            <button
                                key={item.view}
                                onClick={() => handleNavItemClick(item.view)}
                                className={`w-full flex items-center p-3 rounded-xl text-left transition-colors duration-200 ${
                                    isActive 
                                    ? 'bg-green-500 text-white shadow-md' 
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                <item.icon className={`mr-4 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                                <span className="font-semibold">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</span>
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
                                isDarkMode ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                        >
                            <span
                                className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                                    isDarkMode ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                    <p className="text-xs text-center text-gray-400 dark:text-gray-500 px-4">
                        Crafted by Tanmay Garg and Saanvi Jha
                    </p>
                     <button 
                        onClick={handleLogout}
                        className="w-full bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        Logout & Reset
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;