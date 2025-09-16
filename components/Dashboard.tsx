

import React, { useContext, useState, useEffect, useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AppContext } from '../contexts/AppContext';
import { View, type Question, type DailyGoal } from '../types';
import { generateDailyQuestions, generateDailyGoals } from '../services/geminiService';
import toast from 'react-hot-toast';

const StatCard: React.FC<{ title: string; value: string | number; icon: string }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex items-center space-x-4 animate-fade-in">
        <div className="text-4xl">{icon}</div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{value}</p>
        </div>
    </div>
);

// Helper to check if a date string 'yyyy-mm-dd' was yesterday, correcting for timezone issues.
const isYesterday = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to the start of the day in local time

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Parse the date string into local timezone date components to avoid UTC conversion issues
    const [year, month, day] = dateStr.split('-').map(Number);
    const checkDate = new Date(year, month - 1, day); // Month is 0-indexed

    return yesterday.getTime() === checkDate.getTime();
}

const DailyFiveModal: React.FC<{ onClose: () => void; onComplete: () => void }> = ({ onClose, onComplete }) => {
    const { userProfile, setUserProfile } = useContext(AppContext);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [score, setScore] = useState(0);

    const fetchQuestions = useCallback(async () => {
        if (!userProfile) return;
        try {
            setLoading(true);
            const dailyQuestions = await generateDailyQuestions(userProfile.board);
            setQuestions(dailyQuestions);
        } catch (error) {
            toast.error('Failed to load daily questions. Please try again later.');
            onClose();
        } finally {
            setLoading(false);
        }
    }, [userProfile, onClose]);

    useEffect(() => {
        fetchQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAnswer = () => {
        if (!selectedAnswer || !userProfile) return;

        let currentScore = score;
        if (selectedAnswer === questions[currentQuestionIndex].correctAnswer) {
            currentScore += 1;
            setScore(currentScore);
        }

        setSelectedAnswer(null);

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(i => i + 1);
        } else {
            // Quiz finished
            const xpEarned = 25 + (currentScore * 5);
            const newXP = userProfile.XP + xpEarned;
            const today = new Date().toISOString().split('T')[0];
            
            const newStreak = (userProfile.lastDailyCompletion && isYesterday(userProfile.lastDailyCompletion))
                ? userProfile.streak + 1 
                : 1;
            
            if (setUserProfile) {
                setUserProfile({
                    ...userProfile,
                    XP: newXP,
                    streak: newStreak,
                    lastDailyCompletion: today,
                });
            }
            toast.success(`Daily 5 Complete! You scored ${currentScore}/${questions.length} and earned ${xpEarned} XP!`, { duration: 4000, icon: '🎉' });
            onComplete();
            onClose();
        }
    };

    if (loading) return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-2xl">
                <div className="text-center p-8 font-bold text-lg">Generating your Daily 5... ✨</div>
            </div>
        </div>
    );
        
    if (questions.length === 0) return (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-2xl">
                <div className="text-center p-8">Could not load questions. Please try again later.</div>
            </div>
        </div>
    );

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-2xl">
                <h2 className="text-xl sm:text-2xl font-bold mb-4">The Daily 5 - Question {currentQuestionIndex + 1}/5</h2>
                <p className="mb-6 text-md sm:text-lg">{currentQuestion.questionText}</p>
                <div className="space-y-3 mb-6">
                    {currentQuestion.options.map(option => (
                        <button
                            key={option}
                            onClick={() => setSelectedAnswer(option)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${selectedAnswer === option ? 'bg-green-500 border-green-500 text-white font-bold' : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 hover:border-green-400'}`}
                        >
                            {option}
                        </button>
                    ))}
                </div>
                <div className="flex justify-end space-x-4">
                     <button onClick={onClose} className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg">Cancel</button>
                    <button onClick={handleAnswer} disabled={!selectedAnswer} className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-400 font-semibold">
                        {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next'}
                    </button>
                </div>
            </div>
        </div>
    );
};


const Dashboard: React.FC<{ setActiveView: Dispatch<SetStateAction<View>> }> = ({ setActiveView }) => {
    const { userProfile, setDailyGoals, completeDailyGoal } = useContext(AppContext);
    const [showDailyFive, setShowDailyFive] = useState(false);
    
    const today = new Date().toISOString().split('T')[0];
    const dailyCompleted = userProfile?.lastDailyCompletion === today;

    // Daily Goals Logic
    useEffect(() => {
        if (!userProfile) return;
        const todayStr = new Date().toISOString().split('T')[0];
        if (userProfile.dailyGoals?.date !== todayStr) {
            // Generate new goals for today
            generateDailyGoals(userProfile).then(goals => {
                if(setDailyGoals) setDailyGoals(goals);
            }).catch(err => {
                console.error("Failed to generate daily goals:", err);
                toast.error("Could not load daily goals.");
            });
        }
    }, [userProfile, setDailyGoals]);
    
    const handleGoalToggle = (goalId: string, isCompleted: boolean) => {
        if (!isCompleted && completeDailyGoal) {
            completeDailyGoal(goalId);
        }
    };
    
    // Mastery Logic
    const topMasteryTopics = Object.entries(userProfile?.mastery || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);


    const level = userProfile ? Math.floor(userProfile.XP / 100) : 0;
    const xpForCurrentLevel = level * 100;
    const xpForNextLevel = (level + 1) * 100;
    const xpProgress = userProfile ? ((userProfile.XP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100 : 0;


    return (
        <div className="space-y-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 animate-fade-in">Hey {userProfile?.name}, ready to learn?</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="XP Points" value={userProfile?.XP || 0} icon="⭐" />
                <StatCard title="Learning Streak" value={`${userProfile?.streak || 0} Days`} icon="🔥" />
                <StatCard title="Achievements" value={userProfile?.achievements.length || 0} icon="🏆" />
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Your Level: {level}</h2>
                    <span className="font-bold text-green-500">XP: {userProfile?.XP} / {xpForNextLevel}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                    <div 
                        className="bg-green-500 h-4 rounded-full progress-bar-inner" 
                        style={{ width: `${xpProgress}%` }}
                    ></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in">
                    <h2 className="text-2xl font-bold mb-4">Today's Goals</h2>
                    <div className="space-y-3">
                        {userProfile?.dailyGoals?.goals && userProfile.dailyGoals.goals.length > 0 ? (
                            userProfile.dailyGoals.goals.map(goal => (
                                <div key={goal.id} className="flex items-center">
                                    <input 
                                        type="checkbox" 
                                        id={`goal-${goal.id}`} 
                                        checked={goal.isCompleted} 
                                        onChange={() => handleGoalToggle(goal.id, goal.isCompleted)}
                                        className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                        disabled={goal.isCompleted}
                                    />
                                    <label htmlFor={`goal-${goal.id}`} className={`ml-3 text-gray-700 dark:text-gray-300 ${goal.isCompleted ? 'line-through text-gray-400' : ''}`}>
                                        {goal.description} <span className="text-green-500 font-medium">(+{goal.xp} XP)</span>
                                     </label>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">Loading your goals for today...</p>
                        )}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in">
                    <h2 className="text-2xl font-bold mb-4">Top Concepts</h2>
                     <div className="space-y-3">
                        {topMasteryTopics.length > 0 ? (
                            topMasteryTopics.map(([topic, score]) => (
                                <div key={topic}>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-base font-medium text-gray-700 dark:text-gray-300">{topic}</span>
                                        <span className="text-sm font-medium text-green-600 dark:text-green-400">{score}% Mastery</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                                        <div className="bg-green-500 h-2.5 rounded-full" style={{width: `${score}%`}}></div>
                                    </div>
                                </div>
                            ))
                        ) : (
                             <p className="text-gray-500">Take some tests to see your concept mastery!</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col items-start animate-fade-in">
                    <h3 className="text-xl font-bold mb-2">AI Tutor</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 flex-grow">Have a question or a document? Get instant help from your AI tutor that adapts to your learning style.</p>
                    <button onClick={() => setActiveView(View.TUTOR)} className="mt-auto px-5 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600">Start Chat</button>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg flex flex-col items-start animate-fade-in">
                    <h3 className="text-xl font-bold mb-2">Daily Challenge</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 flex-grow">
                        {dailyCompleted 
                            ? "You've completed your daily challenge. Great job!" 
                            : "Test your knowledge with 5 quick questions and boost your streak!"}
                    </p>
                    <button
                        onClick={() => setShowDailyFive(true)}
                        disabled={dailyCompleted}
                        className="mt-auto px-6 py-3 bg-green-600 text-white font-semibold rounded-xl shadow-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
                    >
                        {dailyCompleted ? 'Completed' : 'Start The Daily 5'}
                    </button>
                </div>
            </div>
            
            {showDailyFive && <DailyFiveModal onClose={() => setShowDailyFive(false)} onComplete={() => {}} />}
        </div>
    );
};

export default Dashboard;