

import React, { useState, useContext, useEffect, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { generateTestQuestions, getMistakeExplanation } from '../services/geminiService';
import type { Question, TestRecord, TestTimelineEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

const TIME_PER_QUESTION = 20; // 20 seconds per question for challenges

const TestAndChallengeGenerator: React.FC = () => {
    const { userProfile, setUserProfile, updateMastery, addXP } = useContext(AppContext);
    
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [currentQuiz, setCurrentQuiz] = useState<Question[] | null>(null);
    const [answers, setAnswers] = useState<string[]>([]);
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);
    const [numQuestions, setNumQuestions] = useState(5);
    const [mistakeExplanations, setMistakeExplanations] = useState<{ [key: number]: string }>({});
    const [isExplaining, setIsExplaining] = useState<number | null>(null);
    const [isChallenge, setIsChallenge] = useState(false);
    const [currentTestTitle, setCurrentTestTitle] = useState("");

    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!isChallenge || !currentQuiz || isFinished || timeLeft <= 0) return;
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [isChallenge, currentQuiz, isFinished, timeLeft]);
    
    useEffect(() => {
        if (timeLeft === 0 && isChallenge && currentQuiz && !isFinished) handleSubmit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft, isChallenge, currentQuiz, isFinished]);
    
    const handleGenerate = async ({smart, challenge}: {smart: boolean, challenge: boolean}) => {
        if (!userProfile || !setUserProfile) return;

        let testTopic = topic;
        let title = `Test on ${topic}`;
        if (smart) {
            const weakTopics = Object.entries(userProfile.mastery)
                .filter(([, score]) => score < 80).sort(([, a], [, b]) => a - b).map(([topic]) => topic);
            if (weakTopics.length === 0) { toast.success("No weak topics found! Try a regular test."); return; }
            testTopic = weakTopics.slice(0, 3).join(', ');
            title = "Personalized Test";
        }

        if (!testTopic) { toast.error("Please enter a topic."); return; }

        setIsLoading(true);
        setCurrentQuiz(null);
        setIsFinished(false);
        setAnswers([]);
        setIsChallenge(challenge);
        setCurrentTestTitle(title);
        try {
            if (numQuestions === 20 && userProfile.customQuizTickets > 0) {
                setUserProfile({ ...userProfile, customQuizTickets: userProfile.customQuizTickets - 1 });
                toast.success('Used 1 Custom Quiz Ticket.', { icon: '🎟️' });
            }
            const questions = await generateTestQuestions("General", userProfile.board, testTopic, numQuestions);
            setCurrentQuiz(questions);
            setAnswers(new Array(numQuestions).fill(''));
            if (challenge) setTimeLeft(questions.length * TIME_PER_QUESTION);
        } catch (error) {
            toast.error(`Failed to generate test. Please try again.`);
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
            
            if(!isChallenge) {
                const currentStreak = updatedProfile.conceptStreaks[topic] || 0;
                if (isCorrect) {
                     const newStreak = currentStreak + 1;
                     updatedProfile.conceptStreaks[topic] = newStreak;
                     if ([3, 5, 10].includes(newStreak)) addXP(newStreak * 5, `🔥 ${topic} streak of ${newStreak}`);
                } else {
                    if (currentStreak > 0) toast.error(`Streak for ${topic} lost.`, { icon: '💔' });
                    updatedProfile.conceptStreaks[topic] = 0;
                }
            }
            return { ...q, userAnswer: answers[i], isCorrect: isCorrect, explanation: q.explanation || `The correct answer is ${q.correctAnswer}.`};
        });
        
        const finalScore = Math.round((correctAnswers / currentQuiz.length) * 100);
        setScore(finalScore);
        setIsFinished(true);

        if (!isChallenge && updateMastery && currentTestTitle !== "Past Mistakes Review") {
             const topicsToUpdate = topic.split(',').map(t => t.trim());
             topicsToUpdate.forEach(t => updateMastery(t, finalScore));
        }

        const testId = uuidv4();
        const testSubject = isChallenge ? `Challenge: ${topic}` : currentTestTitle;
        const newTestRecord: TestRecord = {
            testId, subject: testSubject, board: userProfile.board, questions: questionsWithUserAnswers,
            score: finalScore, dateTaken: new Date().toISOString(), totalQuestions: currentQuiz.length,
            correctAnswers, incorrectAnswers: currentQuiz.length - correctAnswers, isChallenge
        };
        
        const newTimelineEntry: TestTimelineEntry = {
            id: uuidv4(), type: 'test' as const, title: `${isChallenge ? 'Challenge' : 'Test'} Completed: ${topic || currentTestTitle}`,
            description: `Scored ${correctAnswers}/${currentQuiz.length} (${finalScore}%)`, date: new Date().toISOString(),
            details: { testId, score: finalScore, topic, correctAnswers, totalQuestions: currentQuiz.length, subject: testSubject }
        };

        updatedProfile.tests.push(newTestRecord);
        updatedProfile.timeline = [newTimelineEntry, ...updatedProfile.timeline].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (isChallenge) {
             if (finalScore >= 80) addXP(75, 'Challenge Won! 🏆'); else toast.error(`Challenge lost. Score: ${finalScore}%.`, { icon: '💔' });
        } else {
             toast.success(`Test submitted! Score: ${finalScore}%`);
        }
        
        setUserProfile(updatedProfile);
    };

    const handleExplainMistake = async (q: Question, userAnswer: string, questionIndex: number) => {
        setIsExplaining(questionIndex);
        try {
            const explanation = await getMistakeExplanation(q.questionText, userAnswer, q.correctAnswer, q.options);
            setMistakeExplanations(prev => ({ ...prev, [questionIndex]: explanation }));
        } catch (error) {
            console.error(error);
            toast.error("Couldn't get explanation.");
        } finally {
            setIsExplaining(null);
        }
    };
    
    const startNew = () => {
        setCurrentQuiz(null); setIsFinished(false); setTopic(''); setMistakeExplanations({});
    };

    const renderQuizTakingScreen = () => (
        <div className="space-y-6 animate-fade-in">
             <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md sticky top-4 z-10">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">{currentTestTitle}</h2>
                    {isChallenge && (<div className={`text-2xl font-bold px-4 py-2 rounded-lg ${timeLeft < 20 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>⏳ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</div>)}
                </div>
            </div>
            {currentQuiz?.map((q, index) => (
                <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                    <p className="font-semibold mb-3">{index + 1}. {q.questionText}</p>
                    <div className="space-y-2">
                        {q.options.map(option => (<label key={option} className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"><input type="radio" name={`question-${index}`} value={option} onChange={(e) => handleAnswerChange(index, e.target.value)} className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500" />{option}</label>))}
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
                    <p className="text-xl mt-4">Your score on "{currentTestTitle}":</p>
                    <div className="flex justify-center items-baseline gap-2 sm:gap-4 my-4"><p className={`text-5xl sm:text-7xl font-extrabold ${score >= 70 ? 'text-green-500' : 'text-red-500'}`}>{marksObtained}/{totalMarks}</p><p className={`text-2xl sm:text-4xl font-bold ${score >= 70 ? 'text-green-400' : 'text-red-400'}`}>({score}%)</p></div>
                </div>
                <div className="mt-8 space-y-6">
                    <h3 className="text-2xl font-bold">Test Review</h3>
                    {currentQuiz?.map((q, index) => {
                        const isCorrect = q.correctAnswer === answers[index];
                        return (
                            <div key={index} className={`p-4 rounded-lg border-2 ${isCorrect ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}`}>
                                <div className="flex justify-between items-start"><p className="font-semibold">Q{index + 1}. {q.questionText}</p><span className={`px-2 py-1 rounded text-xs font-bold ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{isCorrect ? 'Correct' : 'Incorrect'}</span></div>
                                {!isCorrect && answers[index] && (<p className="mt-2 text-sm text-red-600 dark:text-red-400">Your answer: {answers[index]}</p>)}
                                <p className="mt-2 text-sm text-green-700 dark:text-green-400"><span className="font-semibold">Correct answer:</span> {q.correctAnswer}</p>
                                {q.explanation && (<div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md"><p className="text-sm font-medium text-blue-800 dark:text-blue-200">Explanation:</p><p className="text-sm text-blue-700 dark:text-blue-300">{q.explanation}</p></div>)}
                                {!isCorrect && (
                                     <div className="mt-3">
                                        {mistakeExplanations[index] ? (<div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-md"><p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">🤖 AI Insight:</p><p className="text-sm text-indigo-700 dark:text-indigo-300 whitespace-pre-wrap">{mistakeExplanations[index]}</p></div>) : (<button onClick={() => handleExplainMistake(q, answers[index], index)} disabled={isExplaining === index} className="px-3 py-1 bg-indigo-500 text-white text-xs font-semibold rounded-md hover:bg-indigo-600 disabled:bg-gray-400">{isExplaining === index ? 'Thinking...' : '🤖 Explain My Mistake'}</button>)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-8 text-center"><button onClick={startNew} className="py-3 px-6 bg-green-600 text-white font-semibold rounded-xl shadow-md hover:bg-green-700 transition-transform transform hover:scale-105">Back to Practice Center</button></div>
            </div>
        );
    };

    if (currentQuiz && !isFinished) return renderQuizTakingScreen();
    if (isFinished) return renderTestFinishedScreen();
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl sm:text-4xl font-bold">Practice Center</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4">
                    <h2 className="text-xl font-bold">Create a Custom Test</h2>
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
                    <div className="flex gap-2">
                        <button onClick={() => handleGenerate({smart:false, challenge:false})} disabled={isLoading} className="w-1/2 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md disabled:bg-gray-400">{isLoading ? '...' : 'Start Test'}</button>
                        <button onClick={() => handleGenerate({smart:false, challenge:true})} disabled={isLoading} className="w-1/2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md disabled:bg-gray-400">{isLoading ? '...' : 'Start Challenge'}</button>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4 flex flex-col justify-center">
                    <h2 className="text-xl font-bold">Smart Practice</h2>
                     <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Let AI find your weak topics and build a test for you.</p>
                        <button onClick={() => handleGenerate({smart:true, challenge:false})} disabled={isLoading} className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md disabled:bg-gray-400">🤖 AI Personalized Test</button>
                    </div>
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-xl font-bold mb-4">Past Tests & Challenges</h2>
                <ul className="space-y-3 max-h-96 overflow-y-auto">
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