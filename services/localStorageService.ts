
import { UserProfile } from '../types';

const USER_PROFILE_KEY = 'examitoUserProfile';

export const saveUserProfile = (profile: UserProfile | null): void => {
    try {
        if (profile) {
            const profileJson = JSON.stringify(profile);
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
            return JSON.parse(profileJson);
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
        tutorHistory: []
    };
};
