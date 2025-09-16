

import { createContext } from 'react';
import type { UserProfile, Report, TimelineEntry, Message, Flashcard, DailyGoal, StudyPlan } from '../types';

interface AppContextType {
    userProfile: UserProfile | null;
    setUserProfile: ((profile: UserProfile | null) => void) | null;
    loading: boolean;
    addReport: ((report: Report) => void) | null;
    addTimelineEntry: ((entry: TimelineEntry) => void) | null;
    setTutorHistory: ((history: Message[]) => void) | null;
    addFlashcard: ((flashcard: Omit<Flashcard, 'id' | 'dueDate' | 'interval' | 'easeFactor'>) => void) | null;
    updateMastery: ((topic: string, score: number) => void) | null;
    setDailyGoals: ((goals: DailyGoal[]) => void) | null;
    completeDailyGoal: ((goalId: string) => void) | null;
    recordDailyActivity: (() => void) | null;
    addStudyPlan: ((plan: StudyPlan) => void) | null;
    updateFlashcard: ((updatedCard: Flashcard) => void) | null;
    addXP: ((amount: number, reason: string) => void) | null;
}

export const AppContext = createContext<AppContextType>({
    userProfile: null,
    setUserProfile: null,
    loading: true,
    addReport: null,
    addTimelineEntry: null,
    setTutorHistory: null,
    addFlashcard: null,
    updateMastery: null,
    setDailyGoals: null,
    completeDailyGoal: null,
    recordDailyActivity: null,
    addStudyPlan: null,
    updateFlashcard: null,
    addXP: null,
});