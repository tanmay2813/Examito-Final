

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
};

const StudyZone: React.FC = () => {
    // Timer settings
    const [pomodoroMins, setPomodoroMins] = useState(25);
    const [shortBreakMins, setShortBreakMins] = useState(5);
    const [longBreakMins, setLongBreakMins] = useState(15);
    
    const [mode, setMode] = useState<TimerMode>('pomodoro');
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(pomodoroMins * 60);
    const [pomodoros, setPomodoros] = useState(0);

    const handleModeChange = (newMode: TimerMode) => {
        setMode(newMode);
        setIsActive(false);
        switch (newMode) {
            case 'pomodoro': setTimeLeft(pomodoroMins * 60); break;
            case 'shortBreak': setTimeLeft(shortBreakMins * 60); break;
            case 'longBreak': setTimeLeft(longBreakMins * 60); break;
        }
    };
    
    // Effect to update timer when duration settings change
    useEffect(() => {
        if (!isActive) {
            handleModeChange(mode);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pomodoroMins, shortBreakMins, longBreakMins]);

    useEffect(() => {
        // FIX: Replaced NodeJS.Timeout with a more portable type that works in both browser and Node environments.
        let interval: ReturnType<typeof setInterval> | null = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(time => time - 1);
            }, 1000);
        } else if (timeLeft === 0 && isActive) {
            if (mode === 'pomodoro') {
                const newPomodoroCount = pomodoros + 1;
                setPomodoros(newPomodoroCount);
                if (newPomodoroCount % 4 === 0) {
                    handleModeChange('longBreak');
                } else {
                    handleModeChange('shortBreak');
                }
                // Notify user
                if(Notification.permission === 'granted') new Notification('Examito Study Zone', { body: 'Time for a break!' });
            } else {
                handleModeChange('pomodoro');
                if(Notification.permission === 'granted') new Notification('Examito Study Zone', { body: 'Break is over. Time to focus!' });
            }
        }
        return () => {
            if (interval) clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, timeLeft, mode, pomodoros]);
    
    // Request notification permission
    useEffect(() => {
        if(Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    return (
        <div className="space-y-6 flex flex-col items-center text-center">
            <h1 className="text-3xl sm:text-4xl font-bold">Study Zone</h1>
            <p className="text-gray-600 dark:text-gray-300">A distraction-free space to help you focus.</p>

            <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg">
                <div className="flex justify-center space-x-2 mb-8">
                    <button onClick={() => handleModeChange('pomodoro')} className={`px-4 py-2 rounded-md font-semibold ${mode === 'pomodoro' ? 'bg-green-500 text-white' : ''}`}>Focus</button>
                    <button onClick={() => handleModeChange('shortBreak')} className={`px-4 py-2 rounded-md font-semibold ${mode === 'shortBreak' ? 'bg-green-500 text-white' : ''}`}>Short Break</button>
                    <button onClick={() => handleModeChange('longBreak')} className={`px-4 py-2 rounded-md font-semibold ${mode === 'longBreak' ? 'bg-green-500 text-white' : ''}`}>Long Break</button>
                </div>

                <div className="text-7xl sm:text-9xl font-extrabold my-8 text-gray-800 dark:text-gray-100">
                    {formatTime(timeLeft)}
                </div>

                <button 
                    onClick={() => setIsActive(!isActive)}
                    className="w-full py-4 text-2xl font-bold bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-105"
                >
                    {isActive ? 'PAUSE' : 'START'}
                </button>
                
                <p className="mt-6 text-lg">Pomodoros completed: <span className="font-bold">{pomodoros}</span></p>
            </div>

            <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                <h2 className="text-xl font-bold mb-4">Timer Settings (minutes)</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <label htmlFor="pomodoro-time" className="block text-sm font-medium">Focus</label>
                        <input type="number" id="pomodoro-time" value={pomodoroMins} onChange={e => setPomodoroMins(parseInt(e.target.value))} className="w-full p-2 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-center" />
                    </div>
                     <div>
                        <label htmlFor="short-break-time" className="block text-sm font-medium">Short Break</label>
                        <input type="number" id="short-break-time" value={shortBreakMins} onChange={e => setShortBreakMins(parseInt(e.target.value))} className="w-full p-2 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-center" />
                    </div>
                     <div>
                        <label htmlFor="long-break-time" className="block text-sm font-medium">Long Break</label>
                        <input type="number" id="long-break-time" value={longBreakMins} onChange={e => setLongBreakMins(parseInt(e.target.value))} className="w-full p-2 mt-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-center" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudyZone;