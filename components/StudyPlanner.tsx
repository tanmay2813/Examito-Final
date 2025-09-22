


import React, { useState, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { generateStudyPlan } from '../services/geminiService';
import type { StudyPlan } from '../types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import Timeline from './Timeline';

// Make jsPDF available from the CDN
declare const jspdf: any;

type PlannerStep = 'examName' | 'examDate' | 'startDate' | 'topics' | 'confirm';

const PlannerView: React.FC = () => {
    const { userProfile, addStudyPlan } = useContext(AppContext);
    
    // Planner State
    const [step, setStep] = useState<PlannerStep>('examName');
    const [examName, setExamName] = useState('');
    const [examDate, setExamDate] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [topics, setTopics] = useState<string[]>([]);
    const [currentTopic, setCurrentTopic] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<StudyPlan | null>(userProfile?.studyPlans[0] || null);

    const handleNextStep = (currentStep: PlannerStep) => {
        switch(currentStep) {
            case 'examName':
                if (examName.trim()) setStep('examDate'); else toast.error("Please enter an exam name.");
                break;
            case 'examDate':
                if (examDate) setStep('startDate'); else toast.error("Please select an exam date.");
                break;
            case 'startDate':
                if (startDate) setStep('topics'); else toast.error("Please select a start date.");
                break;
             case 'topics':
                if (topics.length > 0) setStep('confirm'); else toast.error("Please add at least one topic.");
                break;
        }
    };

    const handleAddTopic = () => {
        if (currentTopic.trim()) {
            setTopics([...topics, currentTopic.trim()]);
            setCurrentTopic('');
        }
    };
    
    const handleRemoveTopic = (index: number) => setTopics(topics.filter((_, i) => i !== index));

    const handleGeneratePlan = async () => {
        if (!examName || !examDate || topics.length === 0 || !userProfile || !addStudyPlan) {
            toast.error("Something went wrong, please check your inputs."); return;
        }

        setIsLoading(true);
        try {
            const planData = await generateStudyPlan(examName, examDate, topics, userProfile.board, startDate);
            const newPlan: StudyPlan = {
                id: uuidv4(), examName, examDate, topics, plan: planData.plan, dateGenerated: new Date().toISOString()
            };
            addStudyPlan(newPlan);
            setSelectedPlan(newPlan);
            toast.success("New study plan generated!");
            setStep('examName');
            setExamName(''); setExamDate(''); setStartDate(new Date().toISOString().split('T')[0]); setTopics([]);
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate study plan. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleExportToPdf = () => {
        if (!selectedPlan) return;
        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        
        let y = 20;
        doc.setFontSize(22); doc.text(`Study Plan: ${selectedPlan.examName}`, 10, y); y += 8;
        doc.setFontSize(12); doc.text(`Exam Date: ${new Date(selectedPlan.examDate).toLocaleDateString()}`, 10, y); y += 15;

        selectedPlan.plan.forEach(weekData => {
            if (y > 270) { doc.addPage(); y = 20; }
            doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text(`Week ${weekData.week}`, 10, y); y += 8;
            
            weekData.dailyTasks.forEach(dayTask => {
                 if (y > 280) { doc.addPage(); y = 20; }
                doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text(`${dayTask.day}:`, 15, y);
                doc.setFont('helvetica', 'normal');
                const taskText = doc.splitTextToSize(dayTask.task, 150);
                doc.text(taskText, 40, y);
                y += (taskText.length * 5) + 3;
            });
            y += 5;
        });

        doc.save(`${selectedPlan.examName.replace(/\s+/g, '_').toLowerCase()}_study_plan.pdf`);
        toast.success("Study plan exported to PDF!");
    };


    const renderPlannerCreator = () => (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-center mb-4">Let's Create Your Study Plan</h2>
            {step === 'examName' && (<div className="animate-fade-in space-y-4"><label htmlFor="examName" className="block text-lg font-medium text-center">First, what's the name of the exam?</label><input id="examName" type="text" value={examName} onChange={e => setExamName(e.target.value)} placeholder="e.g., Final Biology Exam" className="w-full text-center mt-1 p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600" /><button onClick={() => handleNextStep('examName')} className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">Next</button></div>)}
            {step === 'examDate' && (<div className="animate-fade-in space-y-4"><label htmlFor="examDate" className="block text-lg font-medium text-center">Got it. When is "{examName}"?</label><input id="examDate" type="date" value={examDate} onChange={e => setExamDate(e.target.value)} className="w-full mt-1 p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600" /><div className="flex gap-2"><button onClick={() => setStep('examName')} className="w-1/2 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg">Back</button><button onClick={() => handleNextStep('examDate')} className="w-1/2 py-2 bg-green-600 text-white rounded-lg">Next</button></div></div>)}
            {step === 'startDate' && (<div className="animate-fade-in space-y-4"><label htmlFor="startDate" className="block text-lg font-medium text-center">When would you like to start your study plan?</label><input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600" /><div className="flex gap-2"><button onClick={() => setStep('examDate')} className="w-1/2 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg">Back</button><button onClick={() => handleNextStep('startDate')} className="w-1/2 py-2 bg-green-600 text-white rounded-lg">Next</button></div></div>)}
            {step === 'topics' && (<div className="animate-fade-in space-y-4"><label htmlFor="topics" className="block text-lg font-medium text-center">What topics do you need to cover? Add them one by one.</label><div className="flex gap-2"><input id="topics" value={currentTopic} onChange={e => setCurrentTopic(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddTopic()} placeholder="e.g., Cell Biology" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" /><button type="button" onClick={handleAddTopic} className="px-4 py-2 bg-blue-500 text-white rounded-lg">Add</button></div><ul className="space-y-2 pt-2">{topics.map((t, i) => <li key={i} className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-md">{t} <button onClick={() => handleRemoveTopic(i)} className="text-red-500 font-bold">&times;</button></li>)}</ul><div className="flex gap-2"><button onClick={() => setStep('startDate')} className="w-1/2 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg">Back</button><button onClick={() => handleNextStep('topics')} className="w-1/2 py-2 bg-green-600 text-white rounded-lg">Next</button></div></div>)}
            {step === 'confirm' && (<div className="animate-fade-in space-y-4 text-center"><h3 className="text-xl font-bold">Ready to Go!</h3><p><strong>Exam:</strong> {examName}</p><p><strong>Date:</strong> {new Date(examDate).toLocaleDateString()}</p><p><strong>Start Date:</strong> {new Date(startDate).toLocaleDateString()}</p><p><strong>Topics:</strong> {topics.join(', ')}</p><p className="text-sm text-gray-500">Does this look right?</p><div className="flex gap-2"><button onClick={() => setStep('topics')} className="w-1/2 py-3 bg-gray-300 dark:bg-gray-600 font-semibold rounded-lg">Back</button><button onClick={handleGeneratePlan} disabled={isLoading} className="w-1/2 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400">{isLoading ? 'Generating...' : 'Generate My Plan!'}</button></div></div>)}
        </div>
    );
    
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    {renderPlannerCreator()}
                    {userProfile && userProfile.studyPlans.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                            <h3 className="text-xl font-bold mb-4">Saved Plans</h3>
                            <ul className="space-y-2">
                                {userProfile.studyPlans.map(plan => (<li key={plan.id}><button onClick={() => setSelectedPlan(plan)} className={`w-full text-left p-3 rounded-md transition-colors ${selectedPlan?.id === plan.id ? 'bg-green-500 text-white font-bold' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>{plan.examName} ({new Date(plan.examDate).toLocaleDateString()})</button></li>))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="lg:col-span-2">
                    {selectedPlan ? (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in h-full">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-6">
                                <div><h2 className="text-2xl font-bold mb-1">Study Plan for {selectedPlan.examName}</h2><p className="text-sm text-gray-500 dark:text-gray-400">Exam Date: {new Date(selectedPlan.examDate).toLocaleDateString()}</p></div>
                                <button onClick={handleExportToPdf} className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 text-sm w-full sm:w-auto flex-shrink-0">Export to PDF</button>
                            </div>
                            <div className="space-y-6">
                                {selectedPlan.plan.map(weekData => (
                                    <div key={weekData.week}><h3 className="text-xl font-semibold mb-3 text-green-500">Week {weekData.week}</h3><div className="space-y-3">
                                        {weekData.dailyTasks.map((dayTask, i) => (<div key={`${dayTask.day}-${i}`} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md flex flex-col sm:flex-row justify-between items-start gap-2">
                                            <div className="flex"><span className="font-bold w-24 flex-shrink-0">{dayTask.day}:</span><span>{dayTask.task}</span></div>
                                            {dayTask.activity && dayTask.topic && (<button className="px-2 py-1 bg-green-200 text-green-800 dark:bg-green-700 dark:text-green-100 text-xs font-bold rounded-md hover:bg-green-300 w-full sm:w-auto flex-shrink-0">{dayTask.activity === 'test' ? `Take Test: ${dayTask.topic}` : `Go to ${dayTask.activity}`}</button>)}
                                        </div>))}
                                    </div></div>
                                ))}
                            </div>
                        </div>
                    ) : ( <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md h-full flex flex-col justify-center items-center"><p className="text-lg">Your generated study plans will appear here.</p><p className="text-gray-600 dark:text-gray-300 mt-2">Follow the steps to create your first personalized plan!</p></div>)}
                </div>
            </div>
        </div>
    );
};

const PlanContainer: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'planner' | 'timeline'>('planner');

    return (
        <div className="flex flex-col h-full">
             <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('planner')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'planner' 
                            ? 'border-green-500 text-green-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        AI Study Planner
                    </button>
                    <button
                        onClick={() => setActiveTab('timeline')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeTab === 'timeline' 
                            ? 'border-green-500 text-green-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Learning Timeline
                    </button>
                </nav>
            </div>
            <div className="flex-grow min-h-0 pt-6">
                {activeTab === 'planner' ? <PlannerView /> : <Timeline />}
            </div>
        </div>
    )
}

export default PlanContainer;