

import { UserProfile, Flashcard } from '../types';

const USER_PROFILE_KEY = 'examitoUserProfile';

export const saveUserProfile = (profile: UserProfile | null): void => {
    try {
        if (profile) {
            // Create a deep copy to avoid mutating the React state object.
            const profileToSave: UserProfile = JSON.parse(JSON.stringify(profile));
            
            // Remove base64 image data from tutor history before saving to prevent exceeding localStorage quota.
            if (profileToSave.tutorHistory) {
                profileToSave.tutorHistory.forEach(message => {
                    if (message.files) {
                        message.files.forEach(file => {
                            // The `file` object is `{ name, type, base64Data? }`. We delete `base64Data`.
                            delete file.base64Data;
                        });
                    }
                });
            }

            const profileJson = JSON.stringify(profileToSave);
            localStorage.setItem(USER_PROFILE_KEY, profileJson);
        } else {
            localStorage.removeItem(USER_PROFILE_KEY);
        }
    } catch (error) {
        console.error("Failed to save user profile to local storage:", error);
    }
};

export const loadUserProfile = (): UserProfile | null => {
    try {
        const profileJson = localStorage.getItem(USER_PROFILE_KEY);
        if (profileJson) {
            const profile: UserProfile = JSON.parse(profileJson);
            // Ensure new fields exist for users with old profiles
            profile.flashcards = (profile.flashcards || []).map((card: any) => ({
                ...card,
                dueDate: card.dueDate || new Date().toISOString(),
                interval: card.interval || 1,
                easeFactor: card.easeFactor || 2.5,
            }));
            profile.achievements = profile.achievements || [];
            profile.mastery = profile.mastery || {};
            profile.streakFreezes = profile.streakFreezes || 0;
            profile.dailyGoals = profile.dailyGoals || null;
            profile.studyBuddyPersona = profile.studyBuddyPersona || 'tutor';
            profile.conceptStreaks = profile.conceptStreaks || {};
            profile.dailyTeaser = profile.dailyTeaser || null;
            profile.studyPlans = profile.studyPlans || [];
            profile.dashboardInsight = profile.dashboardInsight || null;
            profile.doubleXpUntil = profile.doubleXpUntil || null;
            profile.customQuizTickets = profile.customQuizTickets || 0;
            return profile;
        }
        return null;
    } catch (error) {
        console.error("Failed to load user profile from local storage:", error);
        return null;
    }
};

export const getInitialUserProfile = (name: string, board: string): UserProfile => {
    return {
        name,
        board,
        XP: 0,
        streak: 0,
        lastDailyCompletion: null,
        tests: [],
        reports: [],
        timeline: [],
        tutorHistory: [],
        flashcards: [],
        achievements: [],
        mastery: {},
        streakFreezes: 1,
        dailyGoals: null,
        studyBuddyPersona: 'tutor',
        conceptStreaks: {},
        dailyTeaser: null,
        studyPlans: [],
        dashboardInsight: null,
        doubleXpUntil: null,
        customQuizTickets: 0,
    };
};