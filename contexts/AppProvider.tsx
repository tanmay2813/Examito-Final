










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
            if (profile.lastDailyCompletion) {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                
                const yesterday = new Date();
                yesterday.setDate(today.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split('T')[0];

                // If the last completion was neither today nor yesterday, the streak is at risk.
                if (profile.lastDailyCompletion !== todayStr && profile.lastDailyCompletion !== yesterdayStr) {
                    const dayBeforeYesterday = new Date();
                    dayBeforeYesterday.setDate(today.getDate() - 2);
                    const dayBeforeYesterdayStr = dayBeforeYesterday.toISOString().split('T')[0];

                    // Check if a streak saver can be used (if they missed exactly one day)
                    if (profile.lastDailyCompletion === dayBeforeYesterdayStr && profile.streakFreezes > 0) {
                        profile.streakFreezes -= 1;
                        // We "back-date" the last completion to yesterday, saving the streak.
                        // When they complete an activity today, the streak will correctly increment.
                        profile.lastDailyCompletion = yesterdayStr;
                        toast('Your streak was saved with a freeze! 🧊', { duration: 4000, icon: '🛡️' });
                    } else {
                        // If they missed more than one day, or have no savers, the streak is lost.
                        if (profile.streak > 0) {
                            toast.error(`Your ${profile.streak}-day streak was lost. Keep learning to start a new one!`, { icon: '💔' });
                        }
                        profile.streak = 0;
                    }
                }
            }
            setUserProfileState(profile);
            toast.success(`Welcome back, ${profile.name}!`);
        }
        setLoading(false);
    }, []);

    const setUserProfile = (profile: UserProfile | null) => {
        if (profile) {
            // Create a mutable copy to work with, preventing direct state mutation.
            const profileUpdate = { ...profile };
            const newlyAwardedAchievements = checkAndAwardAchievements(profileUpdate);
            
            if (newlyAwardedAchievements.length > 0) {
                // Ensure achievements array is a new instance before modifying.
                profileUpdate.achievements = [...profileUpdate.achievements];
                let xpFromAchievements = 0;
                
                newlyAwardedAchievements.forEach(ach => {
                    toast.success(`Achievement Unlocked: ${ach.name}!`, { icon: ach.icon, duration: 4000 });
                    profileUpdate.achievements.push(ach);
                    xpFromAchievements += 50; // Base XP for any achievement
                });

                 if (xpFromAchievements > 0) {
                    let finalAmount = xpFromAchievements;
                    const doubleXpActive = profileUpdate.doubleXpUntil && new Date(profileUpdate.doubleXpUntil) > new Date();

                    if (doubleXpActive) {
                        finalAmount *= 2;
                        toast.success(`+${finalAmount} XP from achievements (2x Boost!)`, { icon: '🚀' });
                    } else {
                        toast.success(`+${finalAmount} XP from achievements!`, { icon: '⭐' });
                    }
                    profileUpdate.XP += finalAmount;
                }
            }
            
            // Set state with the updated, non-mutated object.
            setUserProfileState(profileUpdate);
            saveUserProfile(profileUpdate);
        } else {
            // Handle logout/reset
            setUserProfileState(null);
            saveUserProfile(null);
        }
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
        
        if (newStreak > userProfile.streak && newStreak > 1) {
            toast.success(`Streak extended to ${newStreak} days!`, { icon: '🔥' });
        }
        
        const updatedProfile = {
            ...userProfile,
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

    const addStudyPlan = (plan: StudyPlan) => {
        if (!userProfile) return;
        const updatedProfile = { ...userProfile, studyPlans: [plan, ...userProfile.studyPlans] };
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

    const addFlashcards = (flashcards: Omit<Flashcard, 'id' | 'dueDate' | 'interval' | 'easeFactor'>[]) => {
        if (!userProfile) return;
        const newFlashcards: Flashcard[] = flashcards.map(card => ({
            ...card,
            id: uuidv4(),
            dueDate: new Date().toISOString(),
            interval: 1,
            easeFactor: 2.5,
        }));
        const updatedProfile = { ...userProfile, flashcards: [...newFlashcards, ...userProfile.flashcards] };
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
        if (!userProfile || !userProfile.dailyGoals) return;
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
            if (recordDailyActivity) {
                recordDailyActivity();
            }

            let finalAmount = xpGained;
            const doubleXpActive = userProfile.doubleXpUntil && new Date(userProfile.doubleXpUntil) > new Date();

            if (doubleXpActive) {
                finalAmount *= 2;
            }
            
            toast.success(`Goal complete: ${goalDescription}. +${finalAmount} XP ${doubleXpActive ? '(2x Boost!)' : ''}`, { icon: '⭐' });
            
            const updatedProfile = {
                ...userProfile,
                XP: userProfile.XP + finalAmount,
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
            addStudyPlan,
            addTimelineEntry,
            setTutorHistory,
            addFlashcard,
            addFlashcards,
            updateMastery,
            setDailyGoals,
            completeDailyGoal,
            recordDailyActivity,
            updateFlashcard,
            addXP
        }}>
            {children}
        </AppContext.Provider>
    );
};