

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
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (profile.lastDailyCompletion) {
                const lastCompletionDate = new Date(profile.lastDailyCompletion);
                // Adjust for timezone by getting date parts and reconstructing
                const utcDate = new Date(lastCompletionDate.getUTCFullYear(), lastCompletionDate.getUTCMonth(), lastCompletionDate.getUTCDate());
                utcDate.setHours(0,0,0,0);
                
                const diffTime = today.getTime() - utcDate.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 2 && profile.streakFreezes > 0) {
                    // Missed yesterday, but has a freeze
                    profile.streakFreezes -= 1;
                    const yesterday = new Date(today);
                    yesterday.setDate(today.getDate() - 1);
                    profile.lastDailyCompletion = yesterday.toISOString().split('T')[0];
                    toast('Your streak was saved with a freeze! 🧊', { duration: 4000, icon: '🛡️' });
                } else if (diffDays > 1) {
                    // Missed more than a day or no freezes left
                    if (profile.streak > 0) {
                        toast.error(`Your ${profile.streak}-day streak was lost. Keep learning to start a new one!`, { icon: '💔' });
                    }
                    profile.streak = 0;
                }
            }
            setUserProfileState(profile);
            toast.success(`Welcome back, ${profile.name}!`);
        }
        setLoading(false);
    }, []);

    const setUserProfile = (profile: UserProfile | null) => {
        if (profile) {
            const newlyAwardedAchievements = checkAndAwardAchievements(profile);
            if (newlyAwardedAchievements.length > 0) {
                newlyAwardedAchievements.forEach(ach => {
                    toast.success(`Achievement Unlocked: ${ach.name}!`, { icon: ach.icon, duration: 4000 });
                    profile.achievements.push(ach);
                    profile.XP += 50;
                });
            }
        }
        setUserProfileState(profile);
        saveUserProfile(profile);
    };

    const recordDailyActivity = useCallback(() => {
        if (!userProfile) return;
        const today = new Date().toISOString().split('T')[0];
        if (userProfile.lastDailyCompletion === today) return;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const newStreak = userProfile.lastDailyCompletion === yesterdayStr ? userProfile.streak + 1 : 1;
        const xpEarned = 10;
        
        toast.success(`Daily activity complete! +${xpEarned} XP`, { icon: '✅' });
        if (newStreak > userProfile.streak && newStreak > 1) {
            toast.success(`Streak extended to ${newStreak} days!`, { icon: '🔥' });
        }
        
        const updatedProfile = {
            ...userProfile,
            XP: userProfile.XP + xpEarned,
            streak: newStreak,
            lastDailyCompletion: today,
        };
        setUserProfile(updatedProfile);
    }, [userProfile]);

    const addReport = (report: Report) => {
        if (!userProfile) return;
        const updatedProfile = { ...userProfile, reports: [report, ...userProfile.reports] };
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
        const updatedProfile = { ...userProfile, flashcards: [newFlashcard, ...userProfile.flashcards] };
        setUserProfile(updatedProfile);
    };

    const updateMastery = (topic: string, score: number) => {
        if (!userProfile) return;
        const updatedProfile = {
            ...userProfile,
            mastery: { ...userProfile.mastery, [topic]: Math.max(userProfile.mastery[topic] || 0, score) }
        };
        setUserProfile(updatedProfile);
    };
    
    const setDailyGoals = (goals: DailyGoal[]) => {
        if (!userProfile) return;
        const todayStr = new Date().toISOString().split('T')[0];
        const updatedProfile = { ...userProfile, dailyGoals: { date: todayStr, goals } };
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
                dailyGoals: { ...userProfile.dailyGoals, goals: updatedGoals }
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
            completeDailyGoal,
            recordDailyActivity
        }}>
            {children}
        </AppContext.Provider>
    );
};