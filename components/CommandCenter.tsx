


import React, { useState, useEffect, useContext, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { View } from '../types';
import { AppContext } from '../contexts/AppContext';

// Import all icons
import { HomeIcon } from './icons/HomeIcon';
import { TutorIcon } from './icons/TutorIcon';
import { ReviewIcon } from './icons/ReviewIcon';
import { TestIcon } from './icons/TestIcon';
import { TrackIcon } from './icons/TrackIcon';
import { StoreIcon } from './icons/StoreIcon';
import { StudyZoneIcon } from './icons/StudyZoneIcon';

interface Command {
    id: string;
    name: string;
    section: string;
    action: () => void;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

const CommandCenter: React.FC<{
    isOpen: boolean;
    setIsOpen: Dispatch<SetStateAction<boolean>>;
    setActiveView: Dispatch<SetStateAction<View>>;
}> = ({ isOpen, setIsOpen, setActiveView }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const commands: Command[] = useMemo(() => [
        // Navigation
        { id: 'nav_home', name: 'Go to Home', section: 'Navigation', action: () => setActiveView(View.HOME), icon: HomeIcon },
        { id: 'nav_learn', name: 'Go to Learn', section: 'Navigation', action: () => setActiveView(View.LEARN), icon: TutorIcon },
        { id: 'nav_review', name: 'Go to Review', section: 'Navigation', action: () => setActiveView(View.REVIEW), icon: ReviewIcon },
        { id: 'nav_practice', name: 'Go to Practice', section: 'Navigation', action: () => setActiveView(View.PRACTICE), icon: TestIcon },
        { id: 'nav_track', name: 'Go to Track', section: 'Navigation', action: () => setActiveView(View.TRACK), icon: TrackIcon },
        { id: 'nav_store', name: 'Go to Store', section: 'Navigation', action: () => setActiveView(View.STORE), icon: StoreIcon },
        
        // Actions
        { id: 'action_test', name: 'Start a new Test', section: 'Actions', action: () => setActiveView(View.PRACTICE), icon: TestIcon },
        { id: 'action_flashcards', name: 'Review Flashcards', section: 'Actions', action: () => setActiveView(View.REVIEW), icon: ReviewIcon },
        { id: 'action_focus', name: 'Start Focus Session', section: 'Actions', action: () => { /* TODO: Implement focus session modal */ alert("Focus session not yet implemented in Command Center."); }, icon: StudyZoneIcon },
    ], [setActiveView]);

    const filteredCommands = useMemo(() => {
        if (!query) return commands;
        return commands.filter(cmd =>
            cmd.name.toLowerCase().includes(query.toLowerCase()) ||
            cmd.section.toLowerCase().includes(query.toLowerCase())
        );
    }, [query, commands]);

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const command = filteredCommands[selectedIndex];
                if (command) {
                    command.action();
                    setIsOpen(false);
                }
            } else if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredCommands, selectedIndex, setIsOpen]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 pt-20" onClick={() => setIsOpen(false)}>
            <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <input
                        type="text"
                        placeholder="Type a command or search..."
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                        autoFocus
                        className="w-full bg-transparent text-lg placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
                    />
                </div>
                <ul className="max-h-96 overflow-y-auto p-2">
                    {filteredCommands.length > 0 ? filteredCommands.map((cmd, index) => (
                        <li key={cmd.id}>
                            <button
                                onClick={() => { cmd.action(); setIsOpen(false); }}
                                className={`w-full flex items-center justify-between p-3 rounded-lg text-left ${index === selectedIndex ? 'bg-green-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                                <div className="flex items-center">
                                    <cmd.icon className={`h-5 w-5 mr-3 ${index === selectedIndex ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                                    {cmd.name}
                                </div>
                                <span className={`text-xs ${index === selectedIndex ? 'text-green-200' : 'text-gray-400 dark:text-gray-500'}`}>{cmd.section}</span>
                            </button>
                        </li>
                    )) : (
                        <li className="p-4 text-center text-gray-500">No results found.</li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default CommandCenter;