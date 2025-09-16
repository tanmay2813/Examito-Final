


import React, { useState, useEffect, useCallback } from 'react';
import { AppContext } from './AppContext';
import { saveUserProfile, loadUserProfile } from '../services/localStorageService';
import { checkAndAwardAchievements } from '../services/achievements';
import type { UserProfile, Report, TimelineEntry, Message, Flashcard, DailyGoal, StudyPlan } from '../types';
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
                let xpFromAchievements = 0;
                newlyAwardedAchievements.forEach(ach => {
                    toast.success(`Achievement Unlocked: ${ach.name}!`, { icon: ach.icon, duration: 4000 });
                    profile.achievements.push(ach);
                    xpFromAchievements += 50; // Base XP for any achievement
                });

                 if (xpFromAchievements > 0) {
                    let finalAmount = xpFromAchievements;
                    const doubleXpActive = profile.doubleXpUntil && new Date(profile.doubleXpUntil) > new Date();

                    if (doubleXpActive) {
                        finalAmount *= 2;
                        toast.success(`+${finalAmount} XP from achievements (2x Boost!)`, { icon: '🚀' });
                    } else {
                        toast.success(`+${finalAmount} XP from achievements!`, { icon: '⭐' });
                    }
                    profile.XP += finalAmount;
                }
            }
        }
        setUserProfileState(profile);
        saveUserProfile(profile);
    };

    const addXP = useCallback((amount: number, reason: string) => {
        if (!userProfile) return;

        let finalAmount = amount;
        const doubleXpActive = userProfile.doubleXpUntil && new Date(userProfile.doubleXpUntil) > new Date();

        if (doubleXpActive) {
            finalAmount *= 2;
        }
        
        toast.success(`${reason}. +${finalAmount} XP ${doubleXpActive ? '(2x Boost!)' : ''}`, { icon: '⭐' });

        let profileUpdate = { ...userProfile };
        if (userProfile.doubleXpUntil && new Date(userProfile.doubleXpUntil) <= new Date()) {
            profileUpdate.doubleXpUntil = null;
            // FIX: The 'info' method does not exist on the 'toast' object. 
            // Replaced `toast.info` with a standard `toast()` call to display the informational message.
            toast('Your Double XP boost has expired.', { icon: '⏳' });
        }

        profileUpdate.XP += finalAmount;
        setUserProfile(profileUpdate);
    }, [userProfile]);

    const recordDailyActivity = useCallback(() => {
        if (!userProfile) return;
        const today = new Date().toISOString().split('T')[0];
        if (userProfile.lastDailyCompletion === today) return;

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const newStreak = userProfile.lastDailyCompletion === yesterdayStr ? userProfile.streak + 1 : 1;
        
        if (addXP) addXP(10, "Daily activity complete");

        if (newStreak > userProfile.streak && newStreak > 1) {
            toast.success(`Streak extended to ${newStreak} days!`, { icon: '🔥' });
        }
        
        const updatedProfile = {
            ...userProfile,
            // XP is handled by addXP
            streak: newStreak,
            lastDailyCompletion: today,
        };
        setUserProfile(updatedProfile);
    }, [userProfile, addXP]);

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
    
    const addFlashcard = (flashcard: Omit<Flashcard, 'id' | 'dueDate' | 'interval' | 'easeFactor'>) => {
        if (!userProfile) return;
        const newFlashcard: Flashcard = {
            ...flashcard,
            id: uuidv4(),
            dueDate: new Date().toISOString(),
            interval: 1,
            easeFactor: 2.5,
        };
        const updatedProfile = { ...userProfile, flashcards: [newFlashcard, ...userProfile.flashcards] };
        setUserProfile(updatedProfile);
    };

    const updateFlashcard = (updatedCard: Flashcard) => {
        if (!userProfile) return;
        const updatedFlashcards = userProfile.flashcards.map(card =>
            card.id === updatedCard.id ? updatedCard : card
        );
        const updatedProfile = { ...userProfile, flashcards: updatedFlashcards };
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
        if (!userProfile || !userProfile.dailyGoals || !addXP) return;
        let xpGained = 0;
        let goalDescription = '';
        const updatedGoals = userProfile.dailyGoals.goals.map(g => {
            if (g.id === goalId && !g.isCompleted) {
                xpGained = g.xp;
                goalDescription = g.description;
                return { ...g, isCompleted: true };
            }
            return g;
        });

        if (xpGained > 0) {
            addXP(xpGained, `Goal complete: ${goalDescription}`);
            const updatedProfile = {
                ...userProfile,
                dailyGoals: { ...userProfile.dailyGoals, goals: updatedGoals }
            };
            setUserProfile(updatedProfile);
        }
    };

    const addStudyPlan = (plan: StudyPlan) => {
        if (!userProfile) return;
        const updatedProfile = { ...userProfile, studyPlans: [plan, ...userProfile.studyPlans] };
        setUserProfile(updatedProfile);
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
            recordDailyActivity,
            addStudyPlan,
            updateFlashcard,
            addXP
        }}>
            {children}
        </AppContext.Provider>
    );
};