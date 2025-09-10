

import { createContext } from 'react';
import type { UserProfile, TestRecord, Report, TimelineEntry, Message } from '../types';

interface AppContextType {
    userProfile: UserProfile | null;
    setUserProfile: (profile: UserProfile | null) => void;
    loading: boolean;
    addReport: (report: Report) => void;
    addTimelineEntry: (entry: TimelineEntry) => void;
    setTutorHistory: (history: Message[]) => void;
}

export const AppContext = createContext<AppContextType>({
    userProfile: null,
    setUserProfile: () => {},
    loading: true,
    addReport: () => {},
    addTimelineEntry: () => {},
    setTutorHistory: () => {},
});