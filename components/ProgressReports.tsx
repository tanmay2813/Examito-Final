

import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { generateProgressReport } from '../services/geminiService';
// FIX: Alias the imported Report type to avoid collision with the browser's global Report type.
import type { Report as AppReport } from '../types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

const ProgressReports: React.FC = () => {
    const { userProfile, addReport } = useContext(AppContext);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedReport, setSelectedReport] = useState<AppReport | null>(null);
    
    useEffect(() => {
        if (userProfile?.reports?.length) {
            setSelectedReport(userProfile.reports[0]);
        }
    }, [userProfile?.reports]);

    const handleGenerateReport = async () => {
        if (!userProfile) return;
        
        if (userProfile.tests.length < 3) {
            toast.error("You need to complete at least 3 tests to generate a meaningful report.");
            return;
        }

        setIsLoading(true);
        try {
            const reportData = await generateProgressReport(userProfile);
            const newReport: AppReport = {
                ...reportData,
                reportId: uuidv4(),
                dateGenerated: new Date().toISOString()
            };
            addReport(newReport);
            setSelectedReport(newReport);
            toast.success("New progress report generated!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate report. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold">Progress Reports</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">Track your growth and get personalized learning plans.</p>
                </div>
                <button
                    onClick={handleGenerateReport}
                    disabled={isLoading}
                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-xl shadow-md hover:bg-green-700 disabled:bg-gray-400 transition-transform transform hover:scale-105 w-full sm:w-auto flex-shrink-0"
                >
                    {isLoading ? 'Generating...' : 'Generate New Report'}
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {selectedReport ? (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in h-full">
                            <h2 className="text-2xl font-bold mb-1">Viewing Report</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Generated on {new Date(selectedReport.dateGenerated).toLocaleString()}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-xl font-semibold mb-3 text-green-500">Strengths 💪</h3>
                                    <ul className="list-disc list-inside space-y-2">
                                        {selectedReport.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-3 text-red-500">Areas for Improvement 🧠</h3>
                                    <ul className="list-disc list-inside space-y-2">
                                        {selectedReport.improvements.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                            </div>
                            
                            <div className="mt-8">
                                <h3 className="text-xl font-semibold mb-3 text-blue-500">Your Step-by-Step Plan 🚀</h3>
                                <ol className="list-decimal list-inside space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
                                    {selectedReport.stepByStepPlan.map((s, i) => <li key={i}>{s}</li>)}
                                </ol>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md h-full flex flex-col justify-center">
                            <p className="text-lg">You don't have any reports yet.</p>
                            <p className="text-gray-600 dark:text-gray-300 mt-2">Complete a few tests and then generate your first report to see personalized insights!</p>
                        </div>
                    )}
                </div>

                {userProfile && userProfile.reports.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                        <h3 className="text-xl font-bold mb-4">Report History</h3>
                        <ul className="space-y-2">
                            {userProfile.reports.map(report => (
                                <li key={report.reportId}>
                                    <button 
                                        onClick={() => setSelectedReport(report)}
                                        className={`w-full text-left p-3 rounded-md transition-colors ${selectedReport?.reportId === report.reportId ? 'bg-green-500 text-white font-bold' : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                    >
                                    Report from {new Date(report.dateGenerated).toLocaleString()}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressReports;