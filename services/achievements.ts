import type { UserProfile, Achievement } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface AchievementDefinition {
    id: string;
    name: string;
    description: string;
    icon: string;
    check: (profile: UserProfile) => boolean;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
    {
        id: 'FIRST_LOGIN',
        name: 'Welcome Aboard!',
        description: 'Logged in for the first time.',
        icon: '👋',
        check: (profile) => true, // Always true on first check
    },
    {
        id: 'FIRST_TEST',
        name: 'Test Taker',
        description: 'Completed your first test.',
        icon: '📝',
        check: (profile) => profile.tests.length >= 1,
    },
    {
        id: 'HIGH_SCORER',
        name: 'High Scorer',
        description: 'Scored 90% or more on a test.',
        icon: '🎯',
        check: (profile) => profile.tests.some(t => t.score >= 90),
    },
    {
        id: 'STREAK_3',
        name: 'On a Roll',
        description: 'Maintained a 3-day learning streak.',
        icon: '🔥',
        check: (profile) => profile.streak >= 3,
    },
    {
        id: 'STREAK_7',
        name: 'Streak Champion',
        description: 'Maintained a 7-day learning streak.',
        icon: '🏆',
        check: (profile) => profile.streak >= 7,
    },
    {
        id: 'TUTOR_CHAT_10',
        name: 'Curious Mind',
        description: 'Had a conversation of 10+ messages with the AI Tutor.',
        icon: '🤔',
        check: (profile) => profile.tutorHistory.length >= 10,
    },
     {
        id: 'FLASHCARD_5',
        name: 'Collector',
        description: 'Created 5 or more flashcards.',
        icon: '🃏',
        check: (profile) => profile.flashcards.length >= 5,
    },
    {
        id: 'POLYGLOT',
        name: 'Polymath',
        description: 'Took tests on 3 different topics.',
        icon: '🧠',
        check: (profile) => new Set(profile.tests.map(t => t.subject)).size >= 3,
    },
];

/**
 * Checks the user's profile against all achievement definitions and returns
 * any new achievements that have been unlocked.
 */
export const checkAndAwardAchievements = (profile: UserProfile): Achievement[] => {
    const newlyAwarded: Achievement[] = [];
    const userAchievementIds = new Set(profile.achievements.map(a => a.id));

    for (const def of ACHIEVEMENT_DEFINITIONS) {
        if (!userAchievementIds.has(def.id)) {
            if (def.check(profile)) {
                newlyAwarded.push({
                    id: def.id,
                    name: def.name,
                    description: def.description,
                    icon: def.icon,
                    dateUnlocked: new Date().toISOString(),
                });
            }
        }
    }

    return newlyAwarded;
};