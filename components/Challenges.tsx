
import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../contexts/AppContext';
import { generateTestQuestions } from '../services/geminiService';
import type { Question } from '../types';
import toast from 'react-hot-toast';

const TIME_PER_QUESTION = 20; // 20 seconds per question

const Challenges: React.FC = () => {
    const { userProfile, setUserProfile } = useContext(AppContext);
    const [topic, setTopic] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [challenge, setChallenge] = useState<Question[] | null>(null);
    const [answers, setAnswers] =useState<string[]>([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [score, setScore] = useState(0);

    // Timer logic
    useEffect(() => {
        if (!challenge || isFinished || timeLeft <= 0) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [challenge, isFinished, timeLeft]);
    
    // Auto-submit when time runs out
    useEffect(() => {
        if (timeLeft === 0 && challenge && !isFinished) {
            handleSubmit();
        }
    }, [timeLeft, challenge, isFinished]);


    const handleStartChallenge = async () => {
        if (!topic || !userProfile) {
            toast.error("Please enter a topic for the challenge.");
            return;
        }
        setIsLoading(true);
        setChallenge(null);
        setIsFinished(false);
        try {
            const questions = await generateTestQuestions("General", userProfile.board, topic, 5);
            setChallenge(questions);
            setAnswers(new Array(5).fill(''));
            setTimeLeft(questions.length * TIME_PER_QUESTION);
        } catch (error) {
            toast.error('Failed to generate challenge. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAnswerChange = (qIndex: number, answer: string) => {
        const newAnswers = [...answers];
        newAnswers[qIndex] = answer;
        setAnswers(newAnswers);
    };

    const handleSubmit = () => {
        if (!challenge || !userProfile || !setUserProfile) return;
        
        let correctAnswers = 0;
        challenge.forEach((q, i) => {
            if (q.correctAnswer === answers[i]) {
                correctAnswers++;
            }
        });

        const finalScore = Math.round((correctAnswers / challenge.length) * 100);
        setScore(finalScore);
        setIsFinished(true);

        if (finalScore >= 80) { // Win condition
            const xpEarned = 75;
            setUserProfile({ ...userProfile, XP: userProfile.XP + xpEarned });
            toast.success(`Challenge won! You scored ${finalScore}% and earned ${xpEarned} XP!`, { icon: '🏆' });
        } else {
            toast.error(`Challenge lost. You scored ${finalScore}%. Try again!`, { icon: '💔' });
        }
    };
    
    const resetChallenge = () => {
        setChallenge(null);
        setIsFinished(false);
        setTopic('');
    };

    if (challenge && !isFinished) {
        return (
             <div className="space-y-6 animate-fade-in">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md sticky top-4 z-10">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold">Challenge: {topic}</h2>
                        <div className={`text-2xl font-bold px-4 py-2 rounded-lg ${timeLeft < 20 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                           ⏳ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>
                    </div>
                </div>

                {challenge.map((q, index) => (
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
        )
    }
    
    if (isFinished) {
        return (
             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in text-center">
                 <div className="text-6xl mb-4">{score >= 80 ? '🎉' : '💔'}</div>
                 <h2 className="text-4xl font-bold">{score >= 80 ? 'Challenge Won!' : 'Challenge Lost'}</h2>
                 <p className="text-2xl mt-4">Your score: <span className={`font-bold ${score >= 80 ? 'text-green-500' : 'text-red-500'}`}>{score}%</span></p>
                 <button onClick={resetChallenge} className="mt-8 py-3 px-6 bg-green-600 text-white font-semibold rounded-xl shadow-md hover:bg-green-700">Try Another Challenge</button>
             </div>
        )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl sm:text-4xl font-bold">Quiz Challenges</h1>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4">
                 <h2 className="text-xl font-bold">Start a New Challenge</h2>
                 <p>Face a timed, 5-question quiz on any topic. Score 80% or higher to win bonus XP!</p>
                <div>
                    <label htmlFor="topic" className="block text-sm font-medium mb-1">Topic</label>
                    <input id="topic" type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., The Solar System" className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:ring-green-500 focus:border-green-500" />
                </div>
                <button onClick={handleStartChallenge} disabled={isLoading} className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:bg-gray-400">
                    {isLoading ? 'Preparing...' : 'Start Challenge'}
                </button>
            </div>
        </div>
    );
};

export default Challenges;
