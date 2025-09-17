


export enum View {
    HOME = 'HOME',
    LEARN = 'LEARN',
    REVIEW = 'REVIEW',
    PRACTICE = 'PRACTICE',
    TRACK = 'TRACK',
    STORE = 'STORE',
}

export interface Flashcard {
    id: string;
    front: string; // The question/concept
    back: string; // The answer/explanation
    subject: string;
    // Spaced Repetition System (SRS) fields
    dueDate: string; // ISO 8601 string for the next review date
    interval: number; // The interval in days until the next review
    easeFactor: number; // A multiplier for the interval
}

export interface DailyGoal {
    id: string;
    description: string;
    isCompleted: boolean;
    xp: number;
}

export interface Achievement {
    id:string; // e.g., 'STREAK_CHAMPION_7'
    name: string;
    description: string;
    icon: string;
    dateUnlocked: string; // ISO 8601
}

export type StudyBuddyPersona = 'tutor' | 'encourager' | 'challenger';
export type LearningStyle = 'visual' | 'aural' | 'read/write' | 'kinesthetic' | 'none';

export interface StudyPlanTask {
    day: string;
    task: string;
    activity?: 'tutor' | 'test' | 'flashcards' | 'read';
    topic?: string;
}

export interface StudyPlan {
    id: string;
    examName: string;
    examDate: string;
    topics: string[];
    plan: {
        week: number;
        dailyTasks: StudyPlanTask[];
    }[];
    dateGenerated: string;
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
    studyBuddyPersona: StudyBuddyPersona;
    learningStyle: LearningStyle;
    conceptStreaks: { [topic: string]: number }; // Topic -> streak count
    dailyTeaser: {
        date: string; // YYYY-MM-DD
        teaser: string;
    } | null;
    studyPlans: StudyPlan[];
    dashboardInsight: {
        date: string; // YYYY-MM-DD
        insight: string;
    } | null;
    doubleXpUntil: string | null; // ISO timestamp
    customQuizTickets: number;
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
    isChallenge: boolean;
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
    quiz?: Question[]; // For interactive mini-quizzes
    files?: {
        name: string;
        type: string;
        base64Data?: string;
    }[];
    analysisResult?: string; // To hold results from file analysis
}

// FIX: Define and export the missing ConceptMapNode type.
export interface ConceptMapNode {
    topic: string;
    children?: ConceptMapNode[];
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