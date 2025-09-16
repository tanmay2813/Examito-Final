
import React, { useContext, useState } from 'react';
import { AppContext } from '../contexts/AppContext';
import toast from 'react-hot-toast';

const Flashcard: React.FC<{ front: string; back: string; onDelete: () => void }> = ({ front, back, onDelete }) => {
    const [isFlipped, setIsFlipped] = useState(false);

    return (
        <div className="group h-64 w-full perspective-1000">
            <div 
                className={`relative w-full h-full transform-style-3d transition-transform duration-700 ${isFlipped ? 'rotate-y-180' : ''}`}
                onClick={() => setIsFlipped(!isFlipped)}
            >
                {/* Front of card */}
                <div className="absolute w-full h-full backface-hidden bg-white dark:bg-gray-700 rounded-2xl shadow-lg flex items-center justify-center p-6 cursor-pointer">
                    <p className="text-xl font-semibold text-center">{front}</p>
                </div>
                {/* Back of card */}
                 <div className="absolute w-full h-full backface-hidden bg-green-400 dark:bg-green-600 rounded-2xl shadow-lg flex items-center justify-center p-6 cursor-pointer rotate-y-180">
                    <p className="text-lg text-white text-center">{back}</p>
                </div>
            </div>
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full h-8 w-8 flex items-center justify-center font-bold text-lg opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete Flashcard"
            >
                &times;
            </button>
        </div>
    );
};


const Flashcards: React.FC = () => {
    const { userProfile, setUserProfile } = useContext(AppContext);
    
    const handleDelete = (cardId: string) => {
        if (!userProfile || !setUserProfile) return;
        if (window.confirm("Are you sure you want to delete this flashcard?")) {
            const updatedFlashcards = userProfile.flashcards.filter(f => f.id !== cardId);
            setUserProfile({ ...userProfile, flashcards: updatedFlashcards });
            toast.success("Flashcard deleted.");
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl sm:text-4xl font-bold">Your Flashcards</h1>
            <p className="text-gray-600 dark:text-gray-300">Click on a card to flip it and review the concept. You can create new cards from the AI Tutor.</p>
            
            {userProfile && userProfile.flashcards.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    {userProfile.flashcards.map(card => (
                        <Flashcard 
                            key={card.id}
                            front={card.front}
                            back={card.back}
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
