





import React, { useState, useContext } from 'react';
import ProgressReports from './ProgressReports';
import Achievements from './Achievements';
import { AppContext } from '../contexts/AppContext';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import type { UserTimelineEntry, TimelineEntry } from '../types';

const TrackContainer: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'reports' | 'achievements' | 'timeline'>('reports');

    const renderContent = () => {
        switch (activeTab) {
            case 'reports':
                return <ProgressReports />;
            case 'achievements':
                return <Achievements />;
            case 'timeline':
                return <Timeline />;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('reports')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'reports' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Reports</button>
                    <button onClick={() => setActiveTab('achievements')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'achievements' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Achievements</button>
                    <button onClick={() => setActiveTab('timeline')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'timeline' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Timeline</button>
                </nav>
            </div>
            <div className="mt-6">
                {renderContent()}
            </div>
        </div>
    );
};

const Timeline: React.FC = () => {
    const { userProfile, addTimelineEntry, setUserProfile } = useContext(AppContext);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [reminderFrequency, setReminderFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'none'>('none');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !date || !addTimelineEntry) {
            toast.error("Title and date are required.");
            return;
        }
        const newEntry: UserTimelineEntry = {
            id: uuidv4(), type: 'user', title, description, date, reminderFrequency,
        };
        addTimelineEntry(newEntry);
        setShowForm(false); setTitle(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]); setReminderFrequency('none');
    };
    
    const getEntryId = (entry: TimelineEntry): string => {
        if (entry.type === 'test') return entry.details.testId;
        return entry.id;
    }
    
    const handleDelete = (id: string) => {
        if (!userProfile || !setUserProfile || !window.confirm("Delete this timeline entry?")) return;
        const updatedTimeline = userProfile.timeline.filter(e => getEntryId(e) !== id);
        setUserProfile({ ...userProfile, timeline: updatedTimeline });
        toast.success("Entry deleted.");
    };
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold">Learning Timeline</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">Your schedule and key concepts, all in one place.</p>
                </div>
                <button onClick={() => setShowForm(!showForm)} className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 w-full sm:w-auto flex-shrink-0">
                    {showForm ? 'Cancel' : 'Add New Entry'}
                </button>
            </div>
            
            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4 animate-fade-in">
                    <input type="text" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required />
                    <textarea placeholder="Description (optional)" value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required />
                    <select value={reminderFrequency} onChange={e => setReminderFrequency(e.target.value as any)} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600">
                        <option value="none">No Reminders</option> <option value="daily">Daily</option> <option value="weekly">Weekly</option> <option value="monthly">Monthly</option>
                    </select>
                    <button type="submit" className="w-full py-2 bg-blue-500 text-white rounded-lg">Add to Timeline</button>
                </form>
            )}

             <div className="space-y-4">
                {userProfile && userProfile.timeline.length > 0 ? (
                    userProfile.timeline.map(entry => (
                        <div key={getEntryId(entry)} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md flex items-start justify-between">
                            <div>
                                <p className="text-lg font-bold">{entry.title}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(entry.date).toDateString()}</p>
                                {entry.description && <p className="mt-2 text-gray-700 dark:text-gray-300">{entry.description}</p>}
                            </div>
                             <button onClick={() => handleDelete(getEntryId(entry))} className="text-red-500 hover:text-red-700 font-bold p-2"> &times; </button>
                        </div>
                    ))
                ) : (
                    <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md">
                        <p>Your timeline is empty. Add a study task or save a concept to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
};


export default TrackContainer;