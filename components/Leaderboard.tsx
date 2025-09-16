
import React, { useContext, useMemo } from 'react';
import { AppContext } from '../contexts/AppContext';

const Leaderboard: React.FC = () => {
    const { userProfile } = useContext(AppContext);

    const leaderboardData = useMemo(() => {
        if (!userProfile) return [];

        const otherUsers = [
            { name: 'Saanvi J.', XP: 1450 },
            { name: 'Tanmay G.', XP: 2100 },
            { name: 'Alex R.', XP: 890 },
            { name: 'Maria S.', XP: 1720 },
            { name: 'Kenji T.', XP: 550 },
            { name: 'Chloe B.', XP: 1980 },
            { name: 'Liam P.', XP: 320 },
            { name: 'Fatima A.', XP: 1150 },
            { name: 'Noah L.', XP: 1600 },
        ];
        
        const allUsers = [...otherUsers, { name: `${userProfile.name} (You)`, XP: userProfile.XP }];
        
        return allUsers.sort((a, b) => b.XP - a.XP);

    }, [userProfile]);

    if (!userProfile) return null;

    const rankIcons = ['🥇', '🥈', '🥉'];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl sm:text-4xl font-bold">Weekly Leaderboard</h1>
            <p className="text-gray-600 dark:text-gray-300">See how you stack up against other learners. Keep earning XP to climb the ranks!</p>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {leaderboardData.map((user, index) => {
                        const isCurrentUser = user.name === `${userProfile.name} (You)`;
                        return (
                            <li 
                                key={index} 
                                className={`flex items-center p-4 transition-colors ${isCurrentUser ? 'bg-green-500/20' : ''}`}
                            >
                                <div className="w-12 text-center text-xl sm:text-2xl font-bold text-gray-500 dark:text-gray-400">
                                    {index < 3 ? rankIcons[index] : index + 1}
                                </div>
                                <div className="flex-1 ml-4">
                                    <p className={`text-lg font-semibold ${isCurrentUser ? 'text-green-600 dark:text-green-300' : ''}`}>{user.name}</p>
                                </div>
                                <div className="text-lg font-bold text-green-500">
                                    {user.XP} XP
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
};

export default Leaderboard;
