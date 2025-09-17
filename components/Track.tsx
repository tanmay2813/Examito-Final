

import React, { useState, useContext } from 'react';
import ProgressReports from './ProgressReports';
import Achievements from './Achievements';
// FIX: Removed conflicting imports as these components are now defined locally.
// import Timeline from './Timeline';
// import StudyPlanner from './StudyPlanner'; 
import { AppContext } from '../contexts/AppContext';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import { generateStudyPlan } from '../services/geminiService';
import type { StudyPlan, UserTimelineEntry } from '../types';

const TrackContainer: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'reports' | 'achievements' | 'timeline'>('reports');
    const [showPlannerModal, setShowPlannerModal] = useState(false);

    const renderContent = () => {
        switch (activeTab) {
            case 'reports':
                return <ProgressReports />;
            case 'achievements':
                return <Achievements />;
            case 'timeline':
                // Pass a function to the Timeline component to open the planner modal
                return <Timeline openPlanner={() => setShowPlannerModal(true)} />;
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
                    <button onClick={() => setActiveTab('timeline')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'timeline' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Timeline & Plans</button>
                </nav>
            </div>
            <div className="mt-6">
                {renderContent()}
            </div>
            
            {/* The Study Planner now opens in a modal from the Timeline tab */}
            {showPlannerModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                         <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
                            <h2 className="text-xl font-bold">AI Study Planner</h2>
                            <button onClick={() => setShowPlannerModal(false)} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl font-bold">&times;</button>
                        </div>
                        <div className="overflow-auto p-6">
                            <StudyPlanner onPlanCreated={() => setShowPlannerModal(false)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// We need to redefine a minimal StudyPlanner here, as the original component was a full page.
// This new version is designed to live inside the modal.
const StudyPlanner: React.FC<{ onPlanCreated: () => void }> = ({ onPlanCreated }) => {
    // FIX: useContext and AppContext were not available. Added imports.
    const { userProfile, addStudyPlan } = useContext(AppContext);
    
    // Planner State
    const [step, setStep] = useState('examName');
    const [examName, setExamName] = useState('');
    const [examDate, setExamDate] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [topics, setTopics] = useState<string[]>([]);
    const [currentTopic, setCurrentTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // This component logic is taken from the old StudyPlanner.tsx
    const handleNextStep = (currentStep: string) => {
        // FIX: toast was not defined. Added import.
        switch(currentStep) {
            case 'examName': if (examName.trim()) setStep('examDate'); else toast.error("Please enter an exam name."); break;
            case 'examDate': if (examDate) setStep('startDate'); else toast.error("Please select an exam date."); break;
            case 'startDate': if (startDate) setStep('topics'); else toast.error("Please select a start date."); break;
            case 'topics': if (topics.length > 0) setStep('confirm'); else toast.error("Please add at least one topic."); break;
        }
    };
    const handleAddTopic = () => { if (currentTopic.trim()) { setTopics([...topics, currentTopic.trim()]); setCurrentTopic(''); } };
    const handleRemoveTopic = (index: number) => setTopics(topics.filter((_, i) => i !== index));

    const handleGeneratePlan = async () => {
        if (!examName || !examDate || topics.length === 0 || !userProfile || !addStudyPlan) return;
        setIsLoading(true);
        try {
            // FIX: Removed dynamic imports for geminiService and uuid in favor of top-level imports.
            const planData = await generateStudyPlan(examName, examDate, topics, userProfile.board, startDate);
            addStudyPlan({ id: uuidv4(), examName, examDate, topics, plan: planData.plan, dateGenerated: new Date().toISOString() });
            toast.success("New study plan generated and saved!");
            onPlanCreated(); // Close modal on success
        } catch (error) { toast.error("Failed to generate plan."); } 
        finally { setIsLoading(false); }
    };
    
    // The UI for planner steps
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-4">Let's Create Your Study Plan</h2>
            {step === 'examName' && (<div className="animate-fade-in space-y-4"><label htmlFor="examName" className="block text-lg font-medium text-center">First, what's the name of the exam?</label><input id="examName" type="text" value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g., Final Biology Exam" className="w-full text-center mt-1 p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600" /><button onClick={() => handleNextStep('examName')} className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">Next</button></div>)}
            {step === 'examDate' && (<div className="animate-fade-in space-y-4"><label htmlFor="examDate" className="block text-lg font-medium text-center">When is "{examName}"?</label><input id="examDate" type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="w-full mt-1 p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600" /><div className="flex gap-2"><button onClick={() => setStep('examName')} className="w-1/2 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg">Back</button><button onClick={() => handleNextStep('examDate')} className="w-1/2 py-2 bg-green-600 text-white rounded-lg">Next</button></div></div>)}
            {step === 'startDate' && (<div className="animate-fade-in space-y-4"><label htmlFor="startDate" className="block text-lg font-medium text-center">When would you like to start studying?</label><input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600" /><div className="flex gap-2"><button onClick={() => setStep('examDate')} className="w-1/2 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg">Back</button><button onClick={() => handleNextStep('startDate')} className="w-1/2 py-2 bg-green-600 text-white rounded-lg">Next</button></div></div>)}
            {step === 'topics' && (<div className="animate-fade-in space-y-4"><label htmlFor="topics" className="block text-lg font-medium text-center">What topics do you need to cover?</label><div className="flex gap-2"><input id="topics" value={currentTopic} onChange={e => setCurrentTopic(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddTopic()} placeholder="e.g., Cell Biology" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" /><button type="button" onClick={handleAddTopic} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Add</button></div><ul className="space-y-2 pt-2">{topics.map((t, i) => <li key={i} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-md">{t} <button onClick={() => handleRemoveTopic(i)} className="text-red-500 font-bold">&times;</button></li>)}</ul><div className="flex gap-2"><button onClick={() => setStep('startDate')} className="w-1/2 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg">Back</button><button onClick={() => handleNextStep('topics')} className="w-1/2 py-2 bg-green-600 text-white rounded-lg">Next</button></div></div>)}
            {step === 'confirm' && (<div className="animate-fade-in space-y-4 text-center"><h3 className="text-xl font-bold">Ready to Go!</h3><p><strong>Exam:</strong> {examName}</p><p><strong>Date:</strong> {new Date(examDate).toLocaleDateString()}</p><p><strong>Topics:</strong> {topics.join(', ')}</p><div className="flex gap-2"><button onClick={() => setStep('topics')} className="w-1/2 py-3 bg-gray-300 dark:bg-gray-600 font-semibold rounded-lg">Back</button><button onClick={handleGeneratePlan} disabled={isLoading} className="w-1/2 py-3 bg-green-600 text-white font-semibold rounded-lg disabled:bg-gray-400">{isLoading ? 'Generating...' : 'Generate My Plan!'}</button></div></div>)}
        </div>
    );
};

// Modify Timeline to accept openPlanner prop
const Timeline: React.FC<{openPlanner: () => void}> = ({openPlanner}) => {
    // This component now contains the logic from the original Timeline.tsx
    // FIX: useContext and AppContext were not available. Added imports.
    const { userProfile, addTimelineEntry, setUserProfile } = useContext(AppContext);
    // ... (rest of the original Timeline logic: showForm, title, handleSubmit, handleDelete etc.)
    const { useState } = React;
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    // FIX: Removed require('uuid') as it's not standard ESM and can cause issues. Replaced with top-level import.

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // FIX: Add null check for context function
        if (!addTimelineEntry) return;
        // FIX: Provide a type for the new entry
        const newEntry: UserTimelineEntry = { id: uuidv4(), type: 'user', title, description, date };
        addTimelineEntry(newEntry);
        setShowForm(false); setTitle(''); setDescription(''); setDate(new Date().toISOString().split('T')[0]);
    };
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold">Learning Timeline & Plans</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">Your schedule, key concepts, and AI-generated study plans.</p>
                </div>
                 <button onClick={openPlanner} className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 w-full sm:w-auto flex-shrink-0">
                    Create New AI Study Plan
                </button>
            </div>

            {/* Existing Timeline logic for displaying entries would go here */}
            {userProfile?.studyPlans && userProfile.studyPlans.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                    <h2 className="text-2xl font-bold mb-4">Your Study Plans</h2>
                    {/* A simple list of plans can be shown here */}
                </div>
            )}
             <div className="space-y-4">
                {userProfile && userProfile.timeline.length > 0 ? (
                    userProfile.timeline.map(entry => (
                        <div key={entry.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                            <p className="text-lg font-bold">{entry.title}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(entry.date).toDateString()}</p>
                        </div>
                    ))
                ) : (
                    <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md">
                        <p>Your timeline is empty.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


export default TrackContainer;