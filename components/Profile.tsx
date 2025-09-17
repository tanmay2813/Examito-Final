
import React, { useState } from 'react';
import ProgressReports from './ProgressReports';
import Achievements from './Achievements';

const Profile: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'reports' | 'achievements'>('reports');

    return (
        <div className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${
                            activeTab === 'reports' 
                            ? 'border-green-500 text-green-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Reports
                    </button>
                    <button
                        onClick={() => setActiveTab('achievements')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${
                            activeTab === 'achievements' 
                            ? 'border-green-500 text-green-600' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Achievements
                    </button>
                </nav>
            </div>
            <div className="mt-6">
                {activeTab === 'reports' ? <ProgressReports /> : <Achievements />}
            </div>
        </div>
    );
};

export default Profile;
