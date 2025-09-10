

import React, { useState, useEffect, useCallback } from 'react';
import { AppContext } from './AppContext';
import { saveUserProfile, loadUserProfile, getInitialUserProfile } from '../services/localStorageService';
import type { UserProfile, TestRecord, Report, TimelineEntry, Message } from '../types';
import toast from 'react-hot-toast';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const profile = loadUserProfile();
        if (profile) {
            setUserProfileState(profile);
            toast.success(`Welcome back, ${profile.name}!`);
        }
        setLoading(false);
    }, []);

    const setUserProfile = (profile: UserProfile | null) => {
        setUserProfileState(profile);
        saveUserProfile(profile);
    };

    const addReport = (report: Report) => {
        setUserProfileState(prevProfile => {
            if (!prevProfile) return null;
            const updatedProfile = {
                ...prevProfile,
                reports: [report, ...prevProfile.reports],
            };
            saveUserProfile(updatedProfile);
            return updatedProfile;
        });
    };

    const addTimelineEntry = (entry: TimelineEntry) => {
        setUserProfileState(prevProfile => {
            if (!prevProfile) return null;
            const updatedProfile = {
                ...prevProfile,
                timeline: [entry, ...prevProfile.timeline]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            };
            saveUserProfile(updatedProfile);
            return updatedProfile;
        });
    };
    
    const setTutorHistory = (history: Message[]) => {
         setUserProfileState(prevProfile => {
            if (!prevProfile) return null;
            const updatedProfile = { ...prevProfile, tutorHistory: history };
            saveUserProfile(updatedProfile);
            return updatedProfile;
         });
    };

    return (
        <AppContext.Provider value={{ 
            userProfile, 
            setUserProfile, 
            loading,
            addReport,
            addTimelineEntry,
            setTutorHistory
        }}>
            {children}
        </AppContext.Provider>
    );
};