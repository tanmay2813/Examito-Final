
import React, { useContext } from 'react';
import { AppContext } from '../contexts/AppContext';
import { ACHIEVEMENT_DEFINITIONS } from '../services/achievements'; // We need the full list to show locked ones

const Achievements: React.FC = () => {
    const { userProfile } = useContext(AppContext);
    const unlockedIds = new Set(userProfile?.achievements.map(a => a.id));

    return (
        <div className="space-y-6">
            <h1 className="text-3xl sm:text-4xl font-bold">Your Achievements</h1>
            <p className="text-gray-600 dark:text-gray-300">Celebrate your learning milestones!</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {ACHIEVEMENT_DEFINITIONS.map(def => {
                    const isUnlocked = unlockedIds.has(def.id);
                    const unlockedAchievement = isUnlocked 
                        ? userProfile?.achievements.find(a => a.id === def.id) 
                        : null;
                    
                    return (
                        <div 
                            key={def.id}
                            className={`p-6 rounded-2xl shadow-lg text-center transition-all transform hover:scale-105 ${
                                isUnlocked 
                                ? 'bg-white dark:bg-gray-800' 
                                : 'bg-gray-100 dark:bg-gray-800/50'
                            }`}
                        >
                            <div className={`text-6xl mb-4 transition-transform ${isUnlocked ? '' : 'filter grayscale'}`}>{def.icon}</div>
                            <h3 className="text-xl font-bold">{def.name}</h3>
                            <p className={`text-sm mt-1 ${isUnlocked ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
                                {def.description}
                            </p>
                            {isUnlocked && unlockedAchievement && (
                                <p className="text-xs text-green-500 mt-2 font-semibold">
                                    Unlocked on {new Date(unlockedAchievement.dateUnlocked).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Achievements;
