





import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import { generateSmartReviewSelection } from '../services/geminiService';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Flashcard as FlashcardType, Question, TestRecord, TestTimelineEntry } from '../types';

// --- Flashcard Components ---
const Flashcard: React.FC<{ card: FlashcardType; onDelete: () => void }> = ({ card, onDelete }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    return (
        <div className="relative group h-64 w-full perspective-1000">
            <div className={`w-full h-full transform-style-3d transition-transform duration-700 ${isFlipped ? 'rotate-y-180' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                <div className="absolute w-full h-full backface-hidden bg-white dark:bg-gray-700 rounded-2xl shadow-lg flex items-center justify-center p-6 cursor-pointer overflow-y-auto">
                    <p className="text-xl font-semibold text-center">{card.front}</p>
                </div>
                <div className="absolute w-full h-full backface-hidden bg-green-400 dark:bg-green-600 rounded-2xl shadow-lg flex items-center justify-center p-6 cursor-pointer rotate-y-180 overflow-y-auto">
                    <p className="text-lg text-white text-center">{card.back}</p>
                </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="absolute top-2 right-2 z-10 bg-gray-300 dark:bg-gray-600 rounded-full h-7 w-7 flex items-center justify-center font-bold text-lg hover:bg-red-500 hover:text-white" title="Delete Flashcard">&times;</button>
        </div>
    );
};
const StudySession: React.FC<{ cardsToReview: FlashcardType[]; onSessionEnd: () => void; }> = ({ cardsToReview, onSessionEnd }) => {
    const { updateFlashcard } = useContext(AppContext);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    
    if (!cardsToReview || cardsToReview.length === 0) {
        return (
            <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md">
                <p>No cards to review right now. Great job!</p>
                <button onClick={onSessionEnd} className="mt-4 px-5 py-2 bg-green-600 text-white font-semibold rounded-lg">Back to Deck</button>
            </div>
        );
    }
    
    const currentCard = cardsToReview[currentIndex];
    
    const handleRecall = (rating: 'hard' | 'good' | 'easy') => {
        if (!updateFlashcard) return;
        let { interval, easeFactor } = currentCard;
        if (rating === 'hard') { interval = 1; } 
        else { interval = currentIndex === 0 ? (rating === 'good' ? 3 : 7) : Math.ceil(interval * easeFactor); }
        if (rating === 'easy') easeFactor += 0.15;
        if (rating === 'hard') easeFactor = Math.max(1.3, easeFactor - 0.2);
        const newDueDate = new Date(); newDueDate.setDate(newDueDate.getDate() + interval);
        updateFlashcard({ ...currentCard, dueDate: newDueDate.toISOString(), interval, easeFactor });
        
        setIsFlipped(false);
        if (currentIndex < cardsToReview.length - 1) { setCurrentIndex(currentIndex + 1); } 
        else { toast.success("Study session complete!"); onSessionEnd(); }
    };
    
    return (
        <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-50 flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-2xl mx-auto space-y-6">
                <p className="text-center font-semibold text-gray-600 dark:text-gray-300">Card {currentIndex + 1} of {cardsToReview.length}</p>
                <div className="h-80 w-full perspective-1000">
                    <div className={`relative w-full h-full transform-style-3d transition-transform duration-700 ${isFlipped ? 'rotate-y-180' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                        <div className="absolute w-full h-full backface-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex items-center justify-center p-6 cursor-pointer"><p className="text-2xl font-bold text-center">{currentCard.front}</p></div>
                        <div className="absolute w-full h-full backface-hidden bg-green-500 rounded-2xl shadow-2xl flex items-center justify-center p-6 cursor-pointer rotate-y-180"><p className="text-xl text-white text-center">{currentCard.back}</p></div>
                    </div>
                </div>
                {isFlipped ? (
                    <div className="animate-fade-in">
                        <p className="text-center font-semibold mb-3">How well did you remember this?</p>
                        <div className="grid grid-cols-3 gap-4">
                            <button onClick={() => handleRecall('hard')} className="py-3 px-4 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600">Hard</button>
                            <button onClick={() => handleRecall('good')} className="py-3 px-4 bg-yellow-500 text-white rounded-lg font-bold hover:bg-yellow-600">Good</button>
                            <button onClick={() => handleRecall('easy')} className="py-3 px-4 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600">Easy</button>
                        </div>
                    </div>
                ) : ( <div className="text-center"><button onClick={() => setIsFlipped(true)} className="py-3 px-6 bg-blue-500 text-white rounded-lg font-bold">Flip Card</button></div> )}
            </div>
             <button onClick={onSessionEnd} className="absolute top-4 right-4 text-2xl font-bold">&times;</button>
        </div>
    );
};
const FlashcardsView: React.FC = () => {
    const { userProfile, setUserProfile, addFlashcard } = useContext(AppContext);
    const [showForm, setShowForm] = useState(false);
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [subject, setSubject] = useState('');
    const [isStudying, setIsStudying] = useState(false);
    const [isSmartStudying, setIsSmartStudying] = useState(false);
    const [isLoadingSmartReview, setIsLoadingSmartReview] = useState(false);
    const [smartReviewCards, setSmartReviewCards] = useState<FlashcardType[]>([]);

    const cardsDue = useMemo(() => {
        if (!userProfile) return []; const today = new Date(); today.setHours(23, 59, 59, 999);
        return userProfile.flashcards.filter(card => new Date(card.dueDate) <= today);
    }, [userProfile]);

    const handleSmartReview = async () => {
        if (!userProfile || userProfile.flashcards.length < 5) { toast.error("Need at least 5 flashcards for a Smart Review."); return; }
        setIsLoadingSmartReview(true); const toastId = toast.loading("🤖 AI is analyzing progress...");
        try {
            const subjects = [...new Set(userProfile.flashcards.map(c => c.subject))];
            // FIX: Explicitly type the result from the async call to resolve type inference issue.
            const recommendedSubjects: string[] = await generateSmartReviewSelection(userProfile, subjects);
            if (recommendedSubjects.length === 0) { toast.success("No major weak spots found! Try a regular review.", { id: toastId }); return; }
            const cardsForReview = userProfile.flashcards.filter(card => recommendedSubjects.includes(card.subject)).sort(() => Math.random() - 0.5);
            setSmartReviewCards(cardsForReview.slice(0, 15)); setIsSmartStudying(true);
            toast.success(`Starting Smart Review on: ${recommendedSubjects.join(', ')}`, { id: toastId });
        } catch (error) { toast.error("Could not generate Smart Review.", { id: toastId }); } 
        finally { setIsLoadingSmartReview(false); }
    };
    
    const handleDelete = (cardId: string) => {
        if (!userProfile || !setUserProfile || !window.confirm("Delete this flashcard?")) return;
        setUserProfile({ ...userProfile, flashcards: userProfile.flashcards.filter(f => f.id !== cardId) });
        toast.success("Flashcard deleted.");
    };
    
    const handleAddCard = (e: React.FormEvent) => {
        e.preventDefault();
        if(!front.trim() || !back.trim() || !subject.trim() || !addFlashcard) { toast.error("Please fill out all fields."); return; }
        addFlashcard({ front, back, subject });
        setFront(''); setBack(''); setSubject(''); setShowForm(false);
        toast.success("New flashcard created!");
    }
    
    if (isStudying) return <StudySession cardsToReview={cardsDue} onSessionEnd={() => setIsStudying(false)} />;
    if (isSmartStudying) return <StudySession cardsToReview={smartReviewCards} onSessionEnd={() => setIsSmartStudying(false)} />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold">Your Flashcards</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">Review with our Spaced Repetition System to learn faster.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button onClick={() => setShowForm(!showForm)} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 w-full sm:w-auto"> {showForm ? 'Cancel' : 'Create Card'} </button>
                    <button onClick={handleSmartReview} disabled={isLoadingSmartReview} className="px-5 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 w-full sm:w-auto disabled:bg-gray-400"> {isLoadingSmartReview ? 'Analyzing...' : '🤖 Smart Review'} </button>
                    <button onClick={() => setIsStudying(true)} disabled={cardsDue.length === 0} className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 w-full sm:w-auto disabled:bg-gray-400"> Study ({cardsDue.length} due) </button>
                </div>
            </div>
            {showForm && (
                <form onSubmit={handleAddCard} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4 animate-fade-in">
                    <h2 className="text-xl font-bold">New Custom Flashcard</h2>
                     <div> <label htmlFor="front" className="block text-sm font-medium">Front</label> <textarea id="front" value={front} onChange={e => setFront(e.target.value)} rows={3} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required /> </div>
                     <div> <label htmlFor="back" className="block text-sm font-medium">Back</label> <textarea id="back" value={back} onChange={e => setBack(e.target.value)} rows={3} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required /> </div>
                    <div> <label htmlFor="subject" className="block text-sm font-medium">Subject</label> <input type="text" id="subject" value={subject} onChange={e => setSubject(e.target.value)} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" placeholder="e.g., Biology" required /> </div>
                    <button type="submit" className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save Flashcard</button>
                </form>
            )}
            {userProfile && userProfile.flashcards.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 pt-4">
                    {userProfile.flashcards.map(card => <Flashcard key={card.id} card={card} onDelete={() => handleDelete(card.id)} /> )}
                </div>
            ) : (
                <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md mt-8">
                    <div className="text-5xl mb-4">🃏</div> <p className="text-lg">You have no flashcards yet.</p>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">Go to the AI Tutor and click the card icon to save helpful messages!</p>
                </div>
            )}
        </div>
    );
};

// --- Mistake Zone Components ---
const MistakeZoneView: React.FC = () => {
    const { userProfile, updateMastery } = useContext(AppContext);
    const [quiz, setQuiz] = useState<Question[] | null>(null);
    const [currentQ, setCurrentQ] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    const pastMistakes = useMemo(() => {
        if (!userProfile) return [];
        const incorrectQuestions = new Map<string, Question>();
        userProfile.tests.forEach(test => {
            test.questions.forEach(q => {
                if (q.isCorrect === false) {
                    incorrectQuestions.set(q.questionText, q);
                }
            });
        });
        return Array.from(incorrectQuestions.values());
    }, [userProfile]);

    const handleGenerateMistakesQuiz = () => {
        if (pastMistakes.length < 3) {
            toast.error("You need at least 3 past mistakes to review!");
            return;
        }
        const shuffledMistakes = [...pastMistakes].sort(() => 0.5 - Math.random()).slice(0, 10); // Take up to 10
        setQuiz(shuffledMistakes);
        setCurrentQ(0);
        setSelectedAnswer(null);
        setIsSubmitted(false);
        setScore(0);
        setIsFinished(false);
    };

    const handleNext = () => {
        if (!quiz) return;
        const isCorrect = selectedAnswer === quiz[currentQ].correctAnswer;
        if (isCorrect) setScore(s => s + 1);
        
        setIsSubmitted(false);
        setSelectedAnswer(null);

        if (currentQ < quiz.length - 1) {
            setCurrentQ(q => q + 1);
        } else {
            setIsFinished(true);
            const finalScore = isCorrect ? score + 1 : score;
            const percentage = Math.round((finalScore / quiz.length) * 100);
            toast.success(`Review complete! Score: ${percentage}%`);
        }
    };
    
    if (quiz && !isFinished) {
        const question = quiz[currentQ];
        return (
            <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg animate-fade-in">
                <h2 className="text-2xl font-bold mb-4">Mistake Review ({currentQ + 1}/{quiz.length})</h2>
                <h3 className="text-lg font-semibold mb-4">{question.questionText}</h3>
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
            </div>
        );
    }
    
    if (quiz && isFinished) {
        return (
            <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md animate-fade-in">
                <h2 className="text-2xl font-bold mb-4">Review Complete!</h2>
                <p className="text-4xl font-bold mb-4">{score}/{quiz.length}</p>
                <button onClick={() => setQuiz(null)} className="w-full max-w-xs mx-auto py-2 bg-green-600 text-white font-semibold rounded-lg">Back to Review Center</button>
            </div>
        );
    }

    return (
        <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md animate-fade-in">
            <div className="text-5xl mb-4">🎯</div>
            <h1 className="text-3xl sm:text-4xl font-bold">Mistake Zone</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2 max-w-2xl mx-auto">Turn your weaknesses into strengths. Take a quiz composed of questions you've previously answered incorrectly to master difficult concepts.</p>
            <button onClick={handleGenerateMistakesQuiz} disabled={pastMistakes.length < 3} className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md disabled:bg-gray-400">
                Start Mistakes Review ({pastMistakes.length} available)
            </button>
        </div>
    );
};


const ReviewContainer: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'flashcards' | 'mistakes'>('flashcards');

    return (
        <div className="flex flex-col h-full">
             <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => setActiveTab('flashcards')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'flashcards' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Flashcards</button>
                    <button onClick={() => setActiveTab('mistakes')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'mistakes' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>Mistake Zone</button>
                </nav>
            </div>
            <div className="flex-grow min-h-0 pt-6">
                {activeTab === 'flashcards' ? <FlashcardsView /> : <MistakeZoneView />}
            </div>
        </div>
    )
};

export default ReviewContainer;