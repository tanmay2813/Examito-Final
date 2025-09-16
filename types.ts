

export enum View {
    DASHBOARD = 'DASHBOARD',
    TUTOR = 'TUTOR',
    TESTS = 'TESTS',
    REPORTS = 'REPORTS',
    TIMELINE = 'TIMELINE',
    FLASHCARDS = 'FLASHCARDS',
    ACHIEVEMENTS = 'ACHIEVEMENTS',
    CHALLENGES = 'CHALLENGES'
}

export interface Flashcard {
    id: string;
    front: string; // The question/concept
    back: string; // The answer/explanation
    subject: string;
}

export interface DailyGoal {
    id: string;
    description: string;
    isCompleted: boolean;
    xp: number;
}

export interface Achievement {
    id: string; // e.g., 'STREAK_CHAMPION_7'
    name: string;
    description: string;
    icon: string;
    dateUnlocked: string; // ISO 8601
}

export interface UserProfile {
    name: string;
    board: string;
    XP: number;
    streak: number;
    lastDailyCompletion: string | null; // YYYY-MM-DD
    tests: TestRecord[];
    reports: Report[];
    timeline: TimelineEntry[];
    tutorHistory: Message[];
    flashcards: Flashcard[];
    achievements: Achievement[];
    mastery: { [topic: string]: number }; // Topic -> mastery score (0-100)
    streakFreezes: number;
    dailyGoals: {
        date: string; // YYYY-MM-DD
        goals: DailyGoal[];
    } | null;
}

export interface Question {
    questionText: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
    userAnswer?: string;
    isCorrect?: boolean;
}

export interface TestRecord {
    testId: string;
    subject: string;
    board: string;
    questions: Question[];
    score: number;
    dateTaken: string; // ISO 8601
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
}

export interface Report {
    reportId: string;
    dateGenerated: string; // ISO 8601
    strengths: string[];
    improvements: string[];
    stepByStepPlan: string[];
}

export interface Message {
    id: string;
    text: string;
    sender: 'user' | 'model';
    files?: {
        name: string;
        type: string;
        base64Data?: string;
    }[];
}

// Timeline Entry Types
export interface TestTimelineEntry {
    id: string;
    type: 'test';
    title: string;
    description: string;
    date: string; // ISO 8601
    details: {
        testId: string;
        score: number;
        topic: string;
        correctAnswers: number;
        totalQuestions: number;
        subject: string;
    };
}

export interface UserTimelineEntry {
    id: string;
    type: 'user';
    title: string;
    description?: string;
    date: string; // ISO 8601
    reminderFrequency?: 'daily' | 'weekly' | 'monthly' | 'none';
}

export interface ConceptTimelineEntry {
    id: string;
    type: 'concept';
    title: string;
    description: string;
    date: string; // ISO 8601
}

export type TimelineEntry = TestTimelineEntry | UserTimelineEntry | ConceptTimelineEntry;