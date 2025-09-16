

import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { generateTestQuestions } from '../services/geminiService';
import type { Question, TestRecord, TestTimelineEntry, UserProfile } from '../types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

type Mode = 'test' | 'challenge';
const TIME_PER_QUESTION = 20; // 20 seconds per question for challenges

const TestAndChallengeGenerator: React.FC = () => {
    const { userProfile, setUserProfile, updateMastery, addXP } = useContext(AppContext);
    const [mode, setMode] = useState<Mode>('test');
    
    // Common state
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentQuiz, setCurrentQuiz] = useState<Question[] | null>(null);
    const [answers, setAnswers] = useState<string[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);
    const [numQuestions, setNumQuestions] = useState(5);

    // Challenge-specific state
    const [timeLeft, setTimeLeft] = useState(0);

    // Timer logic for challenges
    useEffect(() => {
        if (mode !== 'challenge' || !currentQuiz || isFinished || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [mode, currentQuiz, isFinished, timeLeft]);
    
    // Auto-submit when time runs out for challenges
    useEffect(() => {
        if (timeLeft === 0 && mode === 'challenge' && currentQuiz && !isFinished) {
            handleSubmit();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft, mode, currentQuiz, isFinished]);

    const handleGenerate = async () => {
        if (!topic || !userProfile || !setUserProfile) {
            toast.error("Please enter a topic.");
            return;
        }
        setIsLoading(true);
        setCurrentQuiz(null);
        setIsFinished(false);
        setAnswers([]);
        try {
            // Use a quiz ticket if a 20-question test is selected
            if (numQuestions === 20 && userProfile.customQuizTickets > 0) {
                setUserProfile({ ...userProfile, customQuizTickets: userProfile.customQuizTickets - 1 });
                toast.success('Used 1 Custom Quiz Ticket.', { icon: '🎟️' });
            }

            const questions = await generateTestQuestions("General", userProfile.board, topic, numQuestions);
            setCurrentQuiz(questions);
            setAnswers(new Array(numQuestions).fill(''));
            if (mode === 'challenge') {
                setTimeLeft(questions.length * TIME_PER_QUESTION);
            }
        } catch (error) {
            toast.error(`Failed to generate ${mode}. Please try again.`);
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAnswerChange = (questionIndex: number, answer: string) => {
        const newAnswers = [...answers];
        newAnswers[questionIndex] = answer;
        setAnswers(newAnswers);
    };
    
    const handleSubmit = () => {
        if (!currentQuiz || !userProfile || !setUserProfile || !addXP) return;
        
        let correctAnswers = 0;
        let updatedProfile = { ...userProfile };

        const questionsWithUserAnswers = currentQuiz.map((q, i) => {
            const isCorrect = q.correctAnswer === answers[i];
            if (isCorrect) correctAnswers++;
            
            // Concept Streak Logic
            const currentStreak = updatedProfile.conceptStreaks[topic] || 0;
            if (isCorrect) {
                 const newStreak = currentStreak + 1;
                 updatedProfile.conceptStreaks[topic] = newStreak;
                 if ([3, 5, 10].includes(newStreak)) {
                     const bonusXP = newStreak * 5;
                     addXP(bonusXP, `🔥 ${topic} streak of ${newStreak}`);
                 }
            } else {
                if (currentStreak > 0) {
                    toast.error(`Streak for ${topic} lost. Keep trying!`, { icon: '💔' });
                }
                updatedProfile.conceptStreaks[topic] = 0;
            }

            return {
                ...q,
                userAnswer: answers[i],
                isCorrect: isCorrect,
                explanation: q.explanation || `The correct answer is ${q.correctAnswer}.`
            };
        });
        
        const finalScore = Math.round((correctAnswers / currentQuiz.length) * 100);
        setScore(finalScore);
        setIsFinished(true);

        // Update mastery regardless of mode
        if (updateMastery) updateMastery(topic, finalScore);

        const testId = uuidv4();
        const testSubject = mode === 'challenge' ? `Challenge: ${topic}` : topic;
        const newTestRecord: TestRecord = {
            testId, subject: testSubject, board: userProfile.board, questions: questionsWithUserAnswers,
            score: finalScore, dateTaken: new Date().toISOString(), totalQuestions: currentQuiz.length,
            correctAnswers, incorrectAnswers: currentQuiz.length - correctAnswers, isChallenge: mode === 'challenge'
        };
        
        const newTimelineEntry: TestTimelineEntry = {
            id: uuidv4(), type: 'test' as const, title: `${mode === 'test' ? 'Test' : 'Challenge'} Completed: ${topic}`,
            description: `Scored ${correctAnswers}/${currentQuiz.length} (${finalScore}%)`, date: new Date().toISOString(),
            details: { testId, score: finalScore, topic, correctAnswers, totalQuestions: currentQuiz.length, subject: testSubject }
        };

        updatedProfile.tests.push(newTestRecord);
        updatedProfile.timeline = [newTimelineEntry, ...updatedProfile.timeline].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (mode === 'test') {
            toast.success(`Test submitted! Your score is ${correctAnswers}/${currentQuiz.length} (${finalScore}%)`);
        } else { // Challenge mode
             if (finalScore >= 80) { // Win condition
                addXP(75, 'Challenge Won! 🏆');
            } else {
                toast.error(`Challenge lost. You scored ${finalScore}%. Try again!`, { icon: '💔' });
            }
        }
        
        setUserProfile(updatedProfile);
    };
    
    const startNew = () => {
        setCurrentQuiz(null);
        setIsFinished(false);
        setTopic('');
    };

    const renderQuizTakingScreen = () => (
        <div className="space-y-6 animate-fade-in">
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md sticky top-4 z-10">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">{mode === 'test' ? 'Test on' : 'Challenge:'} {topic}</h2>
                    {mode === 'challenge' && (
                        <div className={`text-2xl font-bold px-4 py-2 rounded-lg ${timeLeft < 20 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                           ⏳ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>
                    )}
                </div>
            </div>
            {currentQuiz?.map((q, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                    <p className="font-semibold mb-3">{index + 1}. {q.questionText}</p>
                    <div className="space-y-2">
                        {q.options.map(option => (
                            <label key={option} className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                <input type="radio" name={`question-${index}`} value={option} onChange={(e) => handleAnswerChange(index, e.target.value)} className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500" />
                                {option}
                            </label>
                        ))}
                    </div>
                </div>
            ))}
            <button onClick={handleSubmit} className="w-full py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600">Submit</button>
        </div>
    );
    
    const renderTestFinishedScreen = () => {
        const totalMarks = currentQuiz?.length || 0;
        const marksObtained = Math.round((score / 100) * totalMarks);
        
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in">
                <div className="text-center">
                    <div className="text-5xl sm:text-6xl mb-4">🎉</div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-green-600">Test Complete!</h2>
                    <p className="text-xl mt-4">Your score on "{topic}":</p>
                    <div className="flex justify-center items-baseline gap-2 sm:gap-4 my-4">
                        <p className={`text-5xl sm:text-7xl font-extrabold ${score >= 70 ? 'text-green-500' : 'text-red-500'}`}>{marksObtained}/{totalMarks}</p>
                        <p className={`text-2xl sm:text-4xl font-bold ${score >= 70 ? 'text-green-400' : 'text-red-400'}`}>({score}%)</p>
                    </div>
                </div>
                <div className="mt-8 space-y-6">
                    <h3 className="text-2xl font-bold">Test Review</h3>
                    {currentQuiz?.map((q, index) => {
                        const isCorrect = q.correctAnswer === answers[index];
                        return (
                            <div key={index} className={`p-4 rounded-lg border-2 ${isCorrect ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}`}>
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold">Q{index + 1}. {q.questionText}</p>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                                </div>
                                {!isCorrect && answers[index] && (<p className="mt-2 text-sm text-red-600 dark:text-red-400">Your answer: {answers[index]}</p>)}
                                <p className="mt-2 text-sm text-green-700 dark:text-green-400"><span className="font-semibold">Correct answer:</span> {q.correctAnswer}</p>
                                {q.explanation && (<div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md"><p className="text-sm font-medium text-blue-800 dark:text-blue-200">Explanation:</p><p className="text-sm text-blue-700 dark:text-blue-300">{q.explanation}</p></div>)}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-8 text-center"><button onClick={startNew} className="py-3 px-6 bg-green-600 text-white font-semibold rounded-xl shadow-md hover:bg-green-700 transition-transform transform hover:scale-105">Take Another Test</button></div>
            </div>
        );
    };
    
    const renderChallengeFinishedScreen = () => (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in text-center">
            <div className="text-6xl mb-4">{score >= 80 ? '🎉' : '💔'}</div>
            <h2 className="text-4xl font-bold">{score >= 80 ? 'Challenge Won!' : 'Challenge Lost'}</h2>
            <p className="text-2xl mt-4">Your score: <span className={`font-bold ${score >= 80 ? 'text-green-500' : 'text-red-500'}`}>{score}%</span></p>
            <button onClick={startNew} className="mt-8 py-3 px-6 bg-green-600 text-white font-semibold rounded-xl shadow-md hover:bg-green-700">Try Another Challenge</button>
        </div>
    );

    if (currentQuiz && !isFinished) return renderQuizTakingScreen();
    if (isFinished) {
        return mode === 'test' ? renderTestFinishedScreen() : renderChallengeFinishedScreen();
    }
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl sm:text-4xl font-bold">Tests & Challenges</h1>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4">
                <div className="flex w-full bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
                    <button onClick={() => setMode('test')} className={`w-1/2 p-2 rounded-md font-semibold transition-colors ${mode === 'test' ? 'bg-green-500 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}>Practice Test</button>
                    <button onClick={() => setMode('challenge')} className={`w-1/2 p-2 rounded-md font-semibold transition-colors ${mode === 'challenge' ? 'bg-blue-500 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}>Timed Challenge</button>
                </div>

                <h2 className="text-xl font-bold pt-4">{mode === 'test' ? 'Create a New Test' : 'Start a New Challenge'}</h2>
                {mode === 'challenge' && <p className="text-sm text-gray-500 dark:text-gray-400">Face a timed quiz. Score 80% or higher to win bonus XP!</p>}

                <div>
                    <label htmlFor="topic" className="block text-sm font-medium mb-1">Topic</label>
                    <input id="topic" type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Photosynthesis" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-green-500 focus:border-green-500" />
                </div>
                <div>
                    <label htmlFor="numQuestions" className="block text-sm font-medium mb-1">Number of Questions</label>
                    <select id="numQuestions" value={numQuestions} onChange={e => setNumQuestions(parseInt(e.target.value))} className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-green-500 focus:border-green-500">
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        {userProfile && userProfile.customQuizTickets > 0 && <option value={20}>20 (Uses 1 Ticket)</option>}
                    </select>
                </div>
                <button onClick={handleGenerate} disabled={isLoading} className={`w-full py-3 text-white font-semibold rounded-lg shadow-md disabled:bg-gray-400 ${mode === 'test' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {isLoading ? 'Generating...' : (mode === 'test' ? 'Generate Test' : 'Start Challenge')}
                </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-xl font-bold mb-4">Past Tests & Challenges</h2>
                <ul className="space-y-3">
                    {userProfile && userProfile.tests.length > 0 ? (
                        userProfile.tests.slice().reverse().map(test => (
                            <li key={test.testId} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <div><p className="font-semibold">{test.subject}</p><p className="text-sm text-gray-500 dark:text-gray-400">{new Date(test.dateTaken).toLocaleDateString()}</p></div>
                                <p className={`font-bold text-lg ${test.score >= 70 ? 'text-green-500' : 'text-red-500'}`}>{test.score}%</p>
                            </li>
                        ))
                    ) : ( <p>No tests taken yet.</p> )}
                </ul>
            </div>
        </div>
    );
};

export default TestAndChallengeGenerator;