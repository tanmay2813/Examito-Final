import React, { useState, useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { generateTestQuestions } from '../services/geminiService';
import type { Question, TestRecord, TestTimelineEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

const TestGenerator: React.FC = () => {
    const { userProfile, setUserProfile } = useContext(AppContext);
    const [topic, setTopic] = useState('');
    const [subject, setSubject] = useState('General');
    const [numQuestions, setNumQuestions] = useState(5);
    const [isLoading, setIsLoading] = useState(false);
    const [currentTest, setCurrentTest] = useState<Question[] | null>(null);
    const [answers, setAnswers] = useState<string[]>([]);
    const [testFinished, setTestFinished] = useState(false);
    const [score, setScore] = useState(0);

    const handleGenerateTest = async () => {
        if (!topic || !userProfile) {
            toast.error("Please enter a topic for the test.");
            return;
        }
        setIsLoading(true);
        setCurrentTest(null);
        setTestFinished(false);
        setAnswers([]);
        try {
            const questions = await generateTestQuestions(subject, userProfile.board, topic, numQuestions);
            setCurrentTest(questions);
        } catch (error) {
            toast.error('Failed to generate test. Please try again.');
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
    
    const handleSubmitTest = () => {
        if (!currentTest || !userProfile) return;
        
        let correctAnswers = 0;
        const questionsWithUserAnswers = currentTest.map((q, i) => ({
            ...q,
            userAnswer: answers[i],
            isCorrect: q.correctAnswer === answers[i],
            explanation: q.explanation || `The correct answer is ${q.correctAnswer}.`
        }));
        
        questionsWithUserAnswers.forEach(q => {
            if (q.isCorrect) correctAnswers++;
        });
        
        const finalScore = Math.round((correctAnswers / currentTest.length) * 100);
        setScore(finalScore);
        
        const testId = uuidv4();
        const newTestRecord: TestRecord = {
            testId,
            subject: topic,
            board: userProfile.board,
            questions: questionsWithUserAnswers,
            score: finalScore,
            dateTaken: new Date().toISOString(),
            totalQuestions: currentTest.length,
            correctAnswers,
            incorrectAnswers: currentTest.length - correctAnswers
        };
        
        const newTimelineEntry: TestTimelineEntry = {
            id: uuidv4(),
            type: 'test' as const,
            title: `Test Completed: ${topic}`,
            description: `Scored ${correctAnswers}/${currentTest.length} (${finalScore}%)`,
            date: new Date().toISOString(),
            details: {
                testId,
                score: finalScore,
                topic: topic,
                correctAnswers,
                totalQuestions: currentTest.length,
                subject: topic
            }
        };
        
        const updatedProfile = {
            ...userProfile,
            tests: [...userProfile.tests, newTestRecord],
            timeline: [newTimelineEntry, ...userProfile.timeline]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        };
        setUserProfile(updatedProfile);
        
        setTestFinished(true);
        toast.success(`Test submitted! Your score is ${correctAnswers}/${currentTest.length} (${finalScore}%)`);
    };
    
    const startNewTest = () => {
        setCurrentTest(null);
        setTestFinished(false);
        setTopic('');
    };

    if (currentTest && !testFinished) {
        return (
            <div className="space-y-6 animate-fade-in">
                <h2 className="text-3xl font-bold">Test on {topic}</h2>
                {currentTest.map((q, index) => (
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
                <button onClick={handleSubmitTest} className="w-full py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600">Submit Test</button>
            </div>
        );
    }
    
    if (testFinished && currentTest) {
        const totalMarks = currentTest.length;
        const marksObtained = Math.round((score / 100) * totalMarks);
        
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in">
                <div className="text-center">
                    <div className="text-5xl sm:text-6xl mb-4">🎉</div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-green-600">Test Complete!</h2>
                    <p className="text-xl mt-4">Your score on "{topic}":</p>
                    <div className="flex justify-center items-baseline gap-2 sm:gap-4 my-4">
                        <p className={`text-5xl sm:text-7xl font-extrabold ${score >= 70 ? 'text-green-500' : 'text-red-500'}`}>
                            {marksObtained}/{totalMarks}
                        </p>
                        <p className={`text-2xl sm:text-4xl font-bold ${score >= 70 ? 'text-green-400' : 'text-red-400'}`}>
                            ({score}%)
                        </p>
                    </div>
                </div>

                <div className="mt-8 space-y-6">
                    <h3 className="text-2xl font-bold">Test Review</h3>
                    {currentTest.map((q, index) => {
                        const isCorrect = q.correctAnswer === answers[index];
                        return (
                            <div 
                                key={index} 
                                className={`p-4 rounded-lg border-2 ${isCorrect ? 'border-green-200 bg-green-50 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:bg-red-900/20'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <p className="font-semibold">Q{index + 1}. {q.questionText}</p>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {isCorrect ? 'Correct' : 'Incorrect'}
                                    </span>
                                </div>
                                
                                {!isCorrect && answers[index] && (
                                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                        Your answer: {answers[index]}
                                    </p>
                                )}
                                
                                <p className="mt-2 text-sm text-green-700 dark:text-green-400">
                                    <span className="font-semibold">Correct answer:</span> {q.correctAnswer}
                                </p>
                                
                                {q.explanation && (
                                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Explanation:</p>
                                        <p className="text-sm text-blue-700 dark:text-blue-300">{q.explanation}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 text-center">
                    <button 
                        onClick={startNewTest} 
                        className="py-3 px-6 bg-green-600 text-white font-semibold rounded-xl shadow-md hover:bg-green-700 transition-transform transform hover:scale-105"
                    >
                        Take Another Test
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl sm:text-4xl font-bold">Test Generator</h1>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4">
                <h2 className="text-xl font-bold">Create a New Test</h2>
                <div>
                    <label htmlFor="topic" className="block text-sm font-medium mb-1">Topic</label>
                    <input id="topic" type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., Photosynthesis" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-green-500 focus:border-green-500" />
                </div>
                <div>
                    <label htmlFor="numQuestions" className="block text-sm font-medium mb-1">Number of Questions</label>
                    <select id="numQuestions" value={numQuestions} onChange={e => setNumQuestions(parseInt(e.target.value))} className="w-full p-2 border rounded-md dark:bg-gamma-700 dark:border-gray-600 focus:ring-green-500 focus:border-green-500">
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                    </select>
                </div>
                <button onClick={handleGenerateTest} disabled={isLoading} className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400">
                    {isLoading ? 'Generating...' : 'Generate Test'}
                </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-xl font-bold mb-4">Test History</h2>
                <ul className="space-y-3">
                    {userProfile && userProfile.tests.length > 0 ? (
                        userProfile.tests.slice().reverse().map(test => (
                            <li key={test.testId} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                                <div>
                                    <p className="font-semibold">{test.subject}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(test.dateTaken).toLocaleDateString()}</p>
                                </div>
                                <p className={`font-bold text-lg ${test.score >= 70 ? 'text-green-500' : 'text-red-500'}`}>{test.score}%</p>
                            </li>
                        ))
                    ) : (
                        <p>No tests taken yet.</p>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default TestGenerator;