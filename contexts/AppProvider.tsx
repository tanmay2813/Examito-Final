

import React, { useState, useEffect, useCallback } from 'react';
import { AppContext } from './AppContext';
import { saveUserProfile, loadUserProfile } from '../services/localStorageService';
import { checkAndAwardAchievements } from '../services/achievements';
import type { UserProfile, Report, TimelineEntry, Message, Flashcard, DailyGoal } from '../types';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';


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
        // Check for achievements before updating the state
        if (profile) {
            const newlyAwardedAchievements = checkAndAwardAchievements(profile);
            if (newlyAwardedAchievements.length > 0) {
                newlyAwardedAchievements.forEach(ach => {
                    toast.success(`Achievement Unlocked: ${ach.name}!`, { icon: ach.icon, duration: 4000 });
                    profile.achievements.push(ach);
                    profile.XP += 50; // Award XP for achievement
                });
            }
        }
        setUserProfileState(profile);
        saveUserProfile(profile);
    };

    const addReport = (report: Report) => {
        if (!userProfile) return;
        const updatedProfile = {
            ...userProfile,
            reports: [report, ...userProfile.reports],
        };
        setUserProfile(updatedProfile);
    };

    const addTimelineEntry = (entry: TimelineEntry) => {
        if (!userProfile) return;
        const updatedProfile = {
            ...userProfile,
            timeline: [entry, ...userProfile.timeline]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        };
        setUserProfile(updatedProfile);
    };
    
    const setTutorHistory = (history: Message[]) => {
        if (!userProfile) return;
        const updatedProfile = { ...userProfile, tutorHistory: history };
        setUserProfile(updatedProfile);
    };
    
    const addFlashcard = (flashcard: Omit<Flashcard, 'id'>) => {
        if (!userProfile) return;
        const newFlashcard: Flashcard = { ...flashcard, id: uuidv4() };
        const updatedProfile = {
            ...userProfile,
            flashcards: [newFlashcard, ...userProfile.flashcards]
        };
        setUserProfile(updatedProfile);
    };

    const updateMastery = (topic: string, score: number) => {
        if (!userProfile) return;
        const updatedProfile = {
            ...userProfile,
            mastery: {
                ...userProfile.mastery,
                [topic]: Math.max(userProfile.mastery[topic] || 0, score),
            }
        };
        setUserProfile(updatedProfile);
    };
    
    const setDailyGoals = (goals: DailyGoal[]) => {
        if (!userProfile) return;
        const todayStr = new Date().toISOString().split('T')[0];
        const updatedProfile = {
            ...userProfile,
            dailyGoals: {
                date: todayStr,
                goals: goals,
            }
        };
        setUserProfile(updatedProfile);
    };

    const completeDailyGoal = (goalId: string) => {
        if (!userProfile || !userProfile.dailyGoals) return;
        
        let xpGained = 0;
        const updatedGoals = userProfile.dailyGoals.goals.map(g => {
            if (g.id === goalId && !g.isCompleted) {
                xpGained = g.xp;
                return { ...g, isCompleted: true };
            }
            return g;
        });

        if (xpGained > 0) {
            toast.success(`Goal complete! +${xpGained} XP`, { icon: '✨' });
            const updatedProfile = {
                ...userProfile,
                XP: userProfile.XP + xpGained,
                dailyGoals: {
                    ...userProfile.dailyGoals,
                    goals: updatedGoals,
                }
            };
            setUserProfile(updatedProfile);
        }
    };


    return (
        <AppContext.Provider value={{ 
            userProfile, 
            setUserProfile, 
            loading,
            addReport,
            addTimelineEntry,
            setTutorHistory,
            addFlashcard,
            updateMastery,
            setDailyGoals,
            completeDailyGoal
        }}>
            {children}
        </AppContext.Provider>
    );
};