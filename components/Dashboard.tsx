



import React, { useContext, useState, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AppContext } from '../contexts/AppContext';
import { View, type DailyGoal, Question } from '../types';
import { generateDailyGoals, generateDashboardInsight, generateDailyQuestions } from '../services/geminiService';
import toast from 'react-hot-toast';

const Daily5Modal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { userProfile, addXP } = useContext(AppContext);
    const [questions, setQuestions] = useState<Question[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentQ, setCurrentQ] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        if (userProfile) {
            generateDailyQuestions(userProfile.board)
                .then(setQuestions)
                .catch(err => {
                    console.error("Failed to load Daily 5:", err);
                    toast.error("Could not load the Daily 5 quiz.");
                    onClose();
                })
                .finally(() => setIsLoading(false));
        }
    }, [userProfile, onClose]);

    const handleNext = () => {
        if (!questions) return;
        const isCorrect = selectedAnswer === questions[currentQ].correctAnswer;
        if (isCorrect) setScore(s => s + 1);
        
        setIsSubmitted(false);
        setSelectedAnswer(null);

        if (currentQ < questions.length - 1) {
            setCurrentQ(q => q + 1);
        } else {
            setIsFinished(true);
            if (addXP) {
                const finalScore = isCorrect ? score + 1 : score;
                addXP(finalScore * 5, "Daily 5 Quiz"); // 5 XP per correct answer
            }
        }
    };

    if (isLoading) return <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"><div className="text-white">Loading Quiz...</div></div>;
    if (!questions || questions.length === 0) return null;

    const question = questions[currentQ];

    const renderQuiz = () => (
        <>
            <h3 className="text-lg font-bold mb-4">{currentQ + 1}. {question.questionText}</h3>
            <div className="space-y-2 mb-4">
                {question.options.map(option => {
                    const isCorrect = option === question.correctAnswer;
                    const isSelected = option === selectedAnswer;
                    let buttonClass = 'bg-gray-100 dark:bg-gray-600 hover:border-blue-400';
                    if (isSubmitted) {
                        if (isCorrect) buttonClass = 'bg-green-200 dark:bg-green-800 border-green-500';
                        else if (isSelected) buttonClass = 'bg-red-200 dark:bg-red-800 border-red-500';
                    } else if (isSelected) { buttonClass = 'bg-blue-500 border-blue-500 text-white font-bold'; }
                    return <button key={option} onClick={() => !isSubmitted && setSelectedAnswer(option)} disabled={isSubmitted} className={`w-full text-left p-3 rounded-xl border-2 transition-all ${buttonClass}`}>{option}</button>;
                })}
            </div>
            {!isSubmitted && <button onClick={() => setIsSubmitted(true)} disabled={!selectedAnswer} className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg disabled:bg-gray-400">Submit</button>}
            {isSubmitted && <button onClick={handleNext} className="w-full py-2 bg-green-600 text-white font-semibold rounded-lg">Next</button>}
        </>
    );

    const renderFinished = () => (
        <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Daily 5 Complete!</h2>
            <p className="text-4xl font-bold mb-4">{score}/{questions.length}</p>
            <p className="mb-4">You earned {score * 5} XP!</p>
            <button onClick={onClose} className="w-full py-2 bg-green-600 text-white font-semibold rounded-lg">Close</button>
        </div>
    );
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-lg bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Daily 5 Challenge</h2>
                    {!isFinished && <button onClick={onClose} className="text-2xl">&times;</button>}
                </div>
                {isFinished ? renderFinished() : renderQuiz()}
            </div>
        </div>
    );
};


const DailyGoalsWidget: React.FC = () => {
    const { userProfile, setDailyGoals, completeDailyGoal, setUserProfile } = useContext(AppContext);

    useEffect(() => {
        if (!userProfile || !setUserProfile) return;
        const todayStr = new Date().toISOString().split('T')[0];
        if (userProfile.dailyGoals?.date !== todayStr) {
            generateDailyGoals(userProfile).then(goals => {
                if(setDailyGoals) setDailyGoals(goals);
            }).catch(err => {
                console.error("Failed to generate daily goals:", err);
                toast.error("Could not load daily goals.");
            });
        }
    }, [userProfile, setDailyGoals, setUserProfile]);

    const handleGoalToggle = (goalId: string, isCompleted: boolean) => {
        if (!isCompleted && completeDailyGoal) {
            completeDailyGoal(goalId);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg h-full">
            <h2 className="text-xl font-bold mb-4">Today's Goals</h2>
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
    );
};

const QuickActionsWidget: React.FC<{ setActiveView: Dispatch<SetStateAction<View>>, openDaily5: () => void }> = ({ setActiveView, openDaily5 }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg h-full">
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="space-y-3">
             <button onClick={openDaily5} className="w-full text-left p-3 rounded-lg bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
                <span className="font-semibold text-green-800 dark:text-green-200">⚡ Take the Daily 5</span>
            </button>
            <button onClick={() => setActiveView(View.PRACTICE)} className="w-full text-left p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                <span className="font-semibold text-blue-800 dark:text-blue-200">🎯 Start a New Test</span>
            </button>
             <button onClick={() => setActiveView(View.REVIEW)} className="w-full text-left p-3 rounded-lg bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
                <span className="font-semibold text-purple-800 dark:text-purple-200">🃏 Review Flashcards</span>
            </button>
        </div>
    </div>
);

const TimelineWidget: React.FC<{ setActiveView: Dispatch<SetStateAction<View>> }> = ({ setActiveView }) => {
    const { userProfile } = useContext(AppContext);
    const upcomingEvents = useMemo(() => {
        if (!userProfile) return [];
        const today = new Date();
        today.setHours(0,0,0,0);
        return userProfile.timeline
            .filter(e => new Date(e.date) >= today)
            .slice(0, 3);
    }, [userProfile]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg h-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Upcoming Events</h2>
                <button onClick={() => setActiveView(View.TRACK)} className="text-sm text-green-500 font-semibold hover:underline">View All</button>
            </div>
            <div className="space-y-3">
                {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                    <div key={event.id} className="bg-gray-50 dark:bg-gray-700 p-2 rounded-md">
                        <p className="font-semibold text-sm truncate">{event.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(event.date).toLocaleDateString()}</p>
                    </div>
                )) : (
                    <p className="text-gray-500 text-sm">No upcoming events in your timeline.</p>
                )}
            </div>
        </div>
    );
};

const StatsWidget: React.FC = () => {
    const { userProfile } = useContext(AppContext);
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg h-full">
            <h2 className="text-xl font-bold mb-4">Your Stats</h2>
            <div className="flex justify-around text-center">
                <div>
                    <p className="text-3xl sm:text-4xl font-bold text-green-500">{userProfile?.streak || 0}<span className="text-2xl">🔥</span></p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Day Streak</p>
                </div>
                <div>
                    <p className="text-3xl sm:text-4xl font-bold text-blue-500">{userProfile?.streakFreezes || 0}<span className="text-2xl">🧊</span></p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Streak Savers</p>
                </div>
            </div>
        </div>
    );
};

const DailyInsightWidget: React.FC = () => {
    const { userProfile, setUserProfile } = useContext(AppContext);

    useEffect(() => {
        if (!userProfile || !setUserProfile) return;
        const todayStr = new Date().toISOString().split('T')[0];
        if (userProfile.dashboardInsight?.date !== todayStr) {
            generateDashboardInsight(userProfile).then(insight => {
                if (setUserProfile) {
                    setUserProfile({ ...userProfile, dashboardInsight: { date: todayStr, insight } });
                }
            }).catch(err => {
                console.error("Failed to generate dashboard insight:", err);
            });
        }
    }, [userProfile, setUserProfile]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg h-full">
            <h2 className="text-xl font-bold mb-4">💡 Daily Insight</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
                {userProfile?.dashboardInsight?.insight || "Generating your insight for today..."}
            </p>
        </div>
    );
};

const RecentAchievementsWidget: React.FC<{ setActiveView: Dispatch<SetStateAction<View>> }> = ({ setActiveView }) => {
    const { userProfile } = useContext(AppContext);
    const recentAchievements = useMemo(() => {
        if (!userProfile) return [];
        return [...userProfile.achievements].reverse().slice(0, 3);
    }, [userProfile]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg h-full">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Recent Achievements</h2>
                <button onClick={() => setActiveView(View.TRACK)} className="text-sm text-green-500 font-semibold hover:underline">View All</button>
            </div>
            <div className="space-y-3">
                {recentAchievements.length > 0 ? recentAchievements.map(ach => (
                    <div key={ach.id} className="flex items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg">
                        <span className="text-2xl mr-3">{ach.icon}</span>
                        <div>
                            <p className="font-semibold text-sm">{ach.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{ach.description}</p>
                        </div>
                    </div>
                )) : (
                    <p className="text-gray-500 text-sm">Keep learning to unlock your first achievement!</p>
                )}
            </div>
        </div>
    );
};


const Dashboard: React.FC<{ setActiveView: Dispatch<SetStateAction<View>> }> = ({ setActiveView }) => {
    const { userProfile } = useContext(AppContext);
    const [showDaily5, setShowDaily5] = useState(false);

    return (
        <div className="space-y-8">
            {showDaily5 && <Daily5Modal onClose={() => setShowDaily5(false)} />}
            <div className="p-8 rounded-2xl bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-xl animate-fade-in">
                <h1 className="text-3xl sm:text-4xl font-bold">Hey {userProfile?.name}!</h1>
                <p className="mt-2 text-lg">What will you master today?</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Main Column */}
                <div className="md:col-span-2 space-y-6">
                    <DailyGoalsWidget />
                    <RecentAchievementsWidget setActiveView={setActiveView} />
                </div>
                
                 {/* Side Column */}
                <div className="space-y-6 md:col-span-1">
                    <StatsWidget />
                    <DailyInsightWidget />
                    <QuickActionsWidget setActiveView={setActiveView} openDaily5={() => setShowDaily5(true)} />
                    <TimelineWidget setActiveView={setActiveView} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;