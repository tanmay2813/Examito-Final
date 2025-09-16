


import React, { useState, useRef, useEffect, useContext } from 'react';
import { getAdaptiveResponse, generateFlashcards, getSimplifiedResponse } from '../services/geminiService';
import { AppContext } from '../contexts/AppContext';
import { TimelineEntry, Message, UserTimelineEntry, ConceptTimelineEntry, StudyBuddyPersona, Question } from '../types';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

// Make pdfjsLib available from the CDN
declare const pdfjsLib: any;
declare global {
    interface Window {
        renderMathInElement: (element: HTMLElement, options: any) => void;
        katex: any; // Add katex to global scope for robust checking
    }
}

// New component to handle KaTeX rendering for each message safely.
const MessageContent: React.FC<{ text: string }> = ({ text }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // More robust check: ensure both the renderer function and the core katex library are available.
        if (contentRef.current && window.renderMathInElement && window.katex) {
            try {
                // FIX: Corrected a typo. The ref is named `contentRef`, not `content`.
                window.renderMathInElement(contentRef.current, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                });
            } catch (error) {
                console.error("Katex rendering error:", error);
            }
        }
    }, [text]); // Re-run effect if the text prop changes

    // Render the text content directly. The effect will enhance this DOM node.
    return <div ref={contentRef} className="whitespace-pre-wrap">{text}</div>;
};

const InlineQuiz: React.FC<{ quiz: Question[]; onComplete: () => void }> = ({ quiz, onComplete }) => {
    const { addXP } = useContext(AppContext);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const question = quiz[0];

    const handleSubmit = () => {
        if (!selectedAnswer) return;
        setIsSubmitted(true);
        if (selectedAnswer === question.correctAnswer) {
            toast.success("Correct! +10 XP", { icon: '🥳' });
            if (addXP) addXP(10, "Correct quiz answer");
        } else {
            toast.error("Not quite, try again next time!", { icon: '🤔' });
        }
        setTimeout(onComplete, 2500); // Wait a bit before disappearing
    };

    return (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border-l-4 border-blue-400 animate-fade-in">
            <p className="font-bold text-blue-800 dark:text-blue-200 mb-3">Quick Question!</p>
            <p className="mb-4">{question.questionText}</p>
            <div className="space-y-2 mb-4">
                {question.options.map(option => {
                    const isCorrect = option === question.correctAnswer;
                    const isSelected = option === selectedAnswer;
                    let buttonClass = 'bg-gray-100 dark:bg-gray-600 hover:border-blue-400';
                    if (isSubmitted) {
                        if (isCorrect) buttonClass = 'bg-green-200 dark:bg-green-800 border-green-500';
                        else if (isSelected) buttonClass = 'bg-red-200 dark:bg-red-800 border-red-500';
                    } else if (isSelected) {
                        buttonClass = 'bg-blue-500 border-blue-500 text-white font-bold';
                    }
                    return (
                        <button
                            key={option}
                            onClick={() => !isSubmitted && setSelectedAnswer(option)}
                            disabled={isSubmitted}
                            className={`w-full text-left p-3 rounded-xl border-2 transition-all ${buttonClass}`}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>
            {!isSubmitted && (
                <button onClick={handleSubmit} disabled={!selectedAnswer} className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg disabled:bg-gray-400">Submit</button>
            )}
        </div>
    );
};


// Helper to convert file to base64
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove the data URI prefix
    };
    reader.onerror = error => reject(error);
});

// Helper to extract text from a PDF file
const extractPdfText = async (file: File): Promise<string> => {
    if (typeof pdfjsLib === 'undefined') {
        toast.error("PDF library is not loaded. Please refresh the page.");
        throw new Error("pdfjsLib is not defined");
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    const numPagesToProcess = Math.min(5, pdf.numPages);
    if(pdf.numPages > 5) {
        toast.loading(`Analyzing first 5 pages of ${pdf.numPages}-page PDF...`);
    }

    for (let i = 1; i <= numPagesToProcess; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
    }
    toast.dismiss();
    return fullText;
};

const AdaptiveTutor: React.FC = () => {
    const { userProfile, setUserProfile, setTutorHistory, addTimelineEntry, addFlashcard, recordDailyActivity } = useContext(AppContext);
    const messages = userProfile?.tutorHistory || [];

    const [input, setInput] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (typeof pdfjsLib !== 'undefined' && pdfjsLib.GlobalWorkerOptions.workerSrc !== `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (selectedFiles) {
            const newFiles: File[] = Array.from(selectedFiles);
            const supportedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
            const validFiles = newFiles.filter(file => {
                if (supportedTypes.includes(file.type)) {
                    return true;
                }
                toast.error(`Unsupported file type: ${file.name}`);
                return false;
            });
            setFiles(prevFiles => [...prevFiles, ...validFiles]);
            // Reset the input value to allow selecting the same file again
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    
    const handleRemoveFile = (index: number) => {
        setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if ((input.trim() === '' && files.length === 0) || isLoading || !userProfile || !setTutorHistory) return;

        setIsLoading(true);
        if (recordDailyActivity) recordDailyActivity();
        
        const toastId = toast.loading('Preparing your message...');
        
        const userMessage: Message = {
            id: uuidv4(),
            text: input,
            sender: 'user',
            files: undefined,
        };

        try {
            let apiPromptText = input;
            const imageFileInputs: { mimeType: string; data: string }[] = [];
            const messageFiles: Message['files'] = [];

            for (const file of files) {
                const fileMeta = { name: file.name, type: file.type };
                if (file.type === 'application/pdf') {
                    toast.loading(`Reading ${file.name}...`, { id: toastId });
                    const pdfText = await extractPdfText(file);
                    apiPromptText += `\n\n---START OF FILE: ${file.name}---\n${pdfText}\n---END OF FILE: ${file.name}---`;
                    messageFiles.push(fileMeta);
                } else {
                    const base64Data = await toBase64(file);
                    imageFileInputs.push({ mimeType: file.type, data: base64Data });
                    messageFiles.push({ ...fileMeta, base64Data });
                }
            }
            
            userMessage.files = messageFiles.length > 0 ? messageFiles : undefined;
            const currentHistory = [...messages, userMessage];
            setTutorHistory(currentHistory);
            
            setInput('');
            setFiles([]);

            toast.loading('AI is thinking...', { id: toastId });
            
            const aiResponseText = await getAdaptiveResponse(userProfile, messages, apiPromptText, imageFileInputs);
            
            const timelineRegex = /<TIMELINE_ENTRY>([\s\S]*?)<\/TIMELINE_ENTRY>/;
            const quizRegex = /<QUIZ>([\s\S]*?)<\/QUIZ>/;
            const timelineMatch = aiResponseText.match(timelineRegex);
            const quizMatch = aiResponseText.match(quizRegex);

            if (timelineMatch && timelineMatch[1] && addTimelineEntry) {
                try {
                    const timelineJson = JSON.parse(timelineMatch[1]);
                    const newEntry: UserTimelineEntry = { id: uuidv4(), type: 'user', ...timelineJson };
                    addTimelineEntry(newEntry);
                    toast.success(`🗓️ Tutor added "${newEntry.title}" to your timeline!`);
                } catch (e) { console.error("Failed to parse timeline entry:", e); }
            }
            
            const aiMessage: Message = { id: uuidv4(), text: aiResponseText.replace(timelineRegex, '').replace(quizRegex, '').trim(), sender: 'model' };

            if (quizMatch && quizMatch[1]) {
                try {
                    aiMessage.quiz = JSON.parse(quizMatch[1]);
                } catch (e) { console.error("Failed to parse quiz JSON:", e); }
            }

            setTutorHistory([...currentHistory, aiMessage]);
            toast.dismiss(toastId);

        } catch (error) {
            console.error(error);
            const errorMessage: Message = { id: uuidv4(), text: "Sorry, I'm having trouble connecting. Please try again.", sender: 'model' };
            setTutorHistory([...messages, userMessage, errorMessage]);
            toast.error("An error occurred. Please try again.", { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAddToTimeline = (message: Message) => {
        if (!addTimelineEntry) return;
        const title = message.text.length > 40 ? message.text.substring(0, 40) + '...' : message.text;
        const newEntry: ConceptTimelineEntry = {
            id: uuidv4(),
            type: 'concept',
            title: `Concept: ${title}`,
            description: message.text,
            date: new Date().toISOString().split('T')[0],
        };
        addTimelineEntry(newEntry);
        toast.success('Concept saved to timeline!');
    };
    
    const handleCreateFlashcards = async (message: Message) => {
        if (!addFlashcard) return;
        const toastId = toast.loading('Creating flashcards...');
        try {
            const flashcardContents = await generateFlashcards(message.text);
            flashcardContents.forEach(card => addFlashcard(card));
            const cardCount = flashcardContents.length;
            toast.success(`${cardCount} flashcard${cardCount > 1 ? 's' : ''} created and saved!`, { id: toastId });
        } catch (error) {
            console.error("Failed to create flashcards:", error);
            toast.error('Could not create flashcards.', { id: toastId });
        }
    };
    
    const handleExplainSimply = async (message: Message) => {
        if (!setTutorHistory) return;
        setIsLoading(true);
        const toastId = toast.loading('Simplifying...');
        try {
            const simplifiedText = await getSimplifiedResponse(message.text);
            const aiMessage: Message = { id: uuidv4(), text: simplifiedText, sender: 'model' };
            setTutorHistory([...messages, aiMessage]);
            toast.success('Explanation simplified!', { id: toastId });
        } catch (error) {
            console.error("Failed to get simplified response:", error);
            toast.error('Could not simplify the text.', { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePersonaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if(userProfile && setUserProfile) {
            const newPersona = e.target.value as StudyBuddyPersona;
            setUserProfile({ ...userProfile, studyBuddyPersona: newPersona });
            toast.success(`Switched to ${newPersona.charAt(0).toUpperCase() + newPersona.slice(1)} persona!`);
        }
    }
    
    const handleQuizComplete = (messageId: string) => {
        if (setTutorHistory) {
            const updatedHistory = messages.map(msg => {
                if (msg.id === messageId) {
                    const { quiz, ...rest } = msg;
                    return { ...rest, text: msg.text + "\n\n[Quiz complete!]" };
                }
                return msg;
            });
            setTutorHistory(updatedHistory);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4 flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold">AI Tutor</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ask a question or upload files (JPG, PNG, PDF).</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={userProfile?.studyBuddyPersona || 'tutor'}
                        onChange={handlePersonaChange}
                        className="p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                        title="Change AI Persona"
                    >
                        <option value="tutor">🧑‍🏫 Tutor</option>
                        <option value="encourager">🤗 Encourager</option>
                        <option value="challenger">🧐 Challenger</option>
                    </select>
                </div>
            </header>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xl p-4 rounded-xl relative group ${msg.sender === 'user' ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                            {msg.files && msg.files.length > 0 && (
                                <div className="mb-2 grid grid-cols-2 gap-2">
                                    {msg.files.map((file, index) => (
                                        <div key={index}>
                                            {file.base64Data ? (
                                                <img src={`data:${file.type};base64,${file.base64Data}`} alt={file.name} className="rounded-lg max-h-48 object-cover" />
                                            ) : (
                                                <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-sm flex items-center">
                                                    📄 <span className="ml-2 font-semibold truncate">{file.name}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            {msg.quiz ? (
                                <InlineQuiz quiz={msg.quiz} onComplete={() => handleQuizComplete(msg.id)} />
                            ) : (
                                <MessageContent text={msg.text} />
                            )}
                            {msg.sender === 'model' && !msg.quiz && (
                                <div className="absolute -top-3 -right-3 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleExplainSimply(msg)} title="Explain Simply" className="bg-white dark:bg-gray-600 p-1.5 rounded-full shadow-md text-sm">
                                        ✨
                                    </button>
                                    <button onClick={() => handleAddToTimeline(msg)} title="Add to Timeline" className="bg-white dark:bg-gray-600 p-1.5 rounded-full shadow-md text-sm">
                                        🗓️
                                    </button>
                                    <button onClick={() => handleCreateFlashcards(msg)} title="Create Flashcard" className="bg-white dark:bg-gray-600 p-1.5 rounded-full shadow-md text-sm">
                                        🃏
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="max-w-lg p-3 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse">
                            Thinking...
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="space-y-2 mb-2">
                    {files.map((file, index) => (
                         <div key={index} className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded-md">
                            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">📄 {file.name}</span>
                            <button onClick={() => handleRemoveFile(index)} className="text-red-500 hover:text-red-700 text-xl font-bold">&times;</button>
                        </div>
                    ))}
                </div>
                <div className="flex items-center">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/jpeg,image/png,application/pdf" multiple />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 mr-2" title="Attach Files">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                    </button>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type your question here..."
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                        disabled={isLoading}
                    />
                    <button onClick={handleSend} disabled={isLoading || (input.trim() === '' && files.length === 0)} className="ml-4 px-6 py-2 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 disabled:bg-gray-400">
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdaptiveTutor;