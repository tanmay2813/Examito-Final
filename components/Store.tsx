


import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import toast from 'react-hot-toast';

interface StoreItem {
    id: string;
    name: string;
    description: string;
    icon: string;
    cost: number;
    onPurchase: (profile: any) => any;
}

const storeItems: StoreItem[] = [
    {
        id: 'streak_freeze',
        name: 'Streak Saver',
        description: 'Automatically saves your streak if you miss one day.',
        icon: '🧊',
        cost: 250,
        onPurchase: (profile) => ({ ...profile, streakFreezes: profile.streakFreezes + 1 }),
    },
    {
        id: 'double_xp',
        name: 'Double XP (24h)',
        description: 'Earn 2x XP from all sources for the next 24 hours!',
        icon: '🚀',
        cost: 750,
        onPurchase: (profile) => ({ ...profile, doubleXpUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }),
    },
    {
        id: 'quiz_ticket',
        name: 'Custom Quiz Ticket',
        description: 'A ticket to generate one 20-question custom test.',
        icon: '🎟️',
        cost: 200,
        onPurchase: (profile) => ({...profile, customQuizTickets: profile.customQuizTickets + 1 }),
    }
];


const Store: React.FC = () => {
    const { userProfile, setUserProfile } = useContext(AppContext);
    
    const handlePurchase = (item: StoreItem) => {
        if (!userProfile || !setUserProfile) return;
        
        if (userProfile.XP < item.cost) {
            toast.error("Not enough XP to purchase this item.");
            return;
        }

        if (item.id === 'double_xp' && userProfile.doubleXpUntil && new Date(userProfile.doubleXpUntil) > new Date()) {
            toast.error("You already have an active Double XP boost!");
            return;
        }
        
        const updatedProfile = item.onPurchase({ ...userProfile, XP: userProfile.XP - item.cost });
        setUserProfile(updatedProfile);
        toast.success(`Purchased ${item.name}!`);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold">Power-Up Store</h1>
                <p className="text-gray-600 dark:text-gray-300 mt-1">Spend your hard-earned XP on cool items and boosts!</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md">
                 <div className="flex justify-end items-center">
                    <span className="font-bold text-lg text-green-500">Your XP: {userProfile?.XP} ⭐</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {storeItems.map(item => {
                    const canAfford = userProfile ? userProfile.XP >= item.cost : false;
                    const isDoubleXpActive = item.id === 'double_xp' && userProfile?.doubleXpUntil && new Date(userProfile.doubleXpUntil) > new Date();

                    return (
                        <div key={item.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col">
                            <div className="text-6xl text-center mb-4">{item.icon}</div>
                            <h3 className="text-xl font-bold text-center">{item.name}</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-center text-sm my-2 flex-grow">{item.description}</p>
                            <div className="text-center text-lg font-bold text-green-500 my-4">
                                {item.cost} XP
                            </div>
                            <button 
                                onClick={() => handlePurchase(item)}
                                disabled={!canAfford || isDoubleXpActive}
                                className="w-full mt-auto py-2 px-4 bg-green-600 text-white font-semibold rounded-xl shadow-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
                            >
                                {isDoubleXpActive ? 'Already Active' : (canAfford ? 'Buy Now' : 'Not enough XP')}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Store;