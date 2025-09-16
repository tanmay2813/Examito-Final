

import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import type { Flashcard as FlashcardType } from '../types';

const Flashcard: React.FC<{ card: FlashcardType; onDelete: () => void }> = ({ card, onDelete }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div className="relative group h-64 w-full perspective-1000">
            <div 
                className={`w-full h-full transform-style-3d transition-transform duration-700 ${isFlipped ? 'rotate-y-180' : ''}`}
                onClick={() => setIsFlipped(!isFlipped)}
            >
                {/* Front of card */}
                <div className="absolute w-full h-full backface-hidden bg-white dark:bg-gray-700 rounded-2xl shadow-lg flex items-center justify-center p-6 cursor-pointer">
                    <p className="text-xl font-semibold text-center">{card.front}</p>
                </div>
                {/* Back of card */}
                 <div className="absolute w-full h-full backface-hidden bg-green-400 dark:bg-green-600 rounded-2xl shadow-lg flex items-center justify-center p-6 cursor-pointer rotate-y-180">
                    <p className="text-lg text-white text-center">{card.back}</p>
                </div>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                className="absolute top-2 right-2 z-10 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full h-7 w-7 flex items-center justify-center font-bold text-lg hover:bg-red-500 hover:text-white transition-colors"
                title="Delete Flashcard"
            >
                &times;
            </button>
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
        
        if (rating === 'hard') {
            interval = 1; // Reset interval
        } else {
            if (currentIndex === 0) { // First review
                 interval = rating === 'good' ? 3 : 7;
            } else {
                interval = Math.ceil(interval * easeFactor);
            }
        }

        if (rating === 'easy') easeFactor += 0.15;
        if (rating === 'hard') easeFactor = Math.max(1.3, easeFactor - 0.2);

        const newDueDate = new Date();
        newDueDate.setDate(newDueDate.getDate() + interval);
        
        const updatedCard = { ...currentCard, dueDate: newDueDate.toISOString(), interval, easeFactor };
        updateFlashcard(updatedCard);
        
        // Move to next card
        setIsFlipped(false);
        if (currentIndex < cardsToReview.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            // End of session
            toast.success("Study session complete!");
            onSessionEnd();
        }
    };
    
    return (
        <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 z-50 flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-2xl mx-auto space-y-6">
                <p className="text-center font-semibold text-gray-600 dark:text-gray-300">Card {currentIndex + 1} of {cardsToReview.length}</p>
                {/* The Flippable Card */}
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
                ) : (
                    <div className="text-center">
                        <button onClick={() => setIsFlipped(true)} className="py-3 px-6 bg-blue-500 text-white rounded-lg font-bold">Flip Card</button>
                    </div>
                )}
            </div>
             <button onClick={onSessionEnd} className="absolute top-4 right-4 text-2xl font-bold">&times;</button>
        </div>
    );
}


const Flashcards: React.FC = () => {
    const { userProfile, setUserProfile, addFlashcard } = useContext(AppContext);
    const [showForm, setShowForm] = useState(false);
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');
    const [subject, setSubject] = useState('');
    const [isStudying, setIsStudying] = useState(false);

    const cardsDue = useMemo(() => {
        if (!userProfile) return [];
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Set to end of today
        return userProfile.flashcards.filter(card => new Date(card.dueDate) <= today);
    }, [userProfile]);
    
    const handleDelete = (cardId: string) => {
        if (!userProfile || !setUserProfile) return;
        if (window.confirm("Are you sure you want to delete this flashcard?")) {
            const updatedFlashcards = userProfile.flashcards.filter(f => f.id !== cardId);
            setUserProfile({ ...userProfile, flashcards: updatedFlashcards });
            toast.success("Flashcard deleted.");
        }
    };
    
    const handleAddCard = (e: React.FormEvent) => {
        e.preventDefault();
        if(!front.trim() || !back.trim() || !subject.trim() || !addFlashcard) {
            toast.error("Please fill out all fields.");
            return;
        }
        addFlashcard({ front, back, subject });
        setFront('');
        setBack('');
        setSubject('');
        setShowForm(false);
        toast.success("New flashcard created!");
    }
    
    if (isStudying) {
        return <StudySession cardsToReview={cardsDue} onSessionEnd={() => setIsStudying(false)} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold">Your Flashcards</h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">Review cards with our smart Spaced Repetition System to learn faster.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button onClick={() => setShowForm(!showForm)} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 w-full sm:w-auto flex-shrink-0">
                        {showForm ? 'Cancel' : 'Create Card'}
                    </button>
                    <button onClick={() => setIsStudying(true)} disabled={cardsDue.length === 0} className="px-5 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 w-full sm:w-auto flex-shrink-0 disabled:bg-gray-400 disabled:cursor-not-allowed">
                        Study ({cardsDue.length} due)
                    </button>
                </div>
            </div>
            
            {showForm && (
                <form onSubmit={handleAddCard} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg space-y-4 animate-fade-in">
                    <h2 className="text-xl font-bold">New Custom Flashcard</h2>
                     <div>
                        <label htmlFor="front" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Front (Question/Term)</label>
                        <textarea id="front" value={front} onChange={e => setFront(e.target.value)} rows={3} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                     <div>
                        <label htmlFor="back" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Back (Answer/Definition)</label>
                        <textarea id="back" value={back} onChange={e => setBack(e.target.value)} rows={3} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" required />
                    </div>
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                        <input type="text" id="subject" value={subject} onChange={e => setSubject(e.target.value)} className="w-full mt-1 p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600" placeholder="e.g., Biology" required />
                    </div>
                    <button type="submit" className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">Save Flashcard</button>
                </form>
            )}
            
            {userProfile && userProfile.flashcards.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 pt-4">
                    {userProfile.flashcards.map(card => (
                        <Flashcard 
                            key={card.id}
                            card={card}
                            onDelete={() => handleDelete(card.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md mt-8">
                    <div className="text-5xl mb-4">🃏</div>
                    <p className="text-lg">You don't have any flashcards yet.</p>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">Go to the AI Tutor and click the card icon on any helpful message to save it as a flashcard!</p>
                </div>
            )}
        </div>
    );
};

export default Flashcards;