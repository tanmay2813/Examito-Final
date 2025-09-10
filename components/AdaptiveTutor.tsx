
import React, { useState, useRef, useEffect, useContext } from 'react';
import { getAdaptiveResponse } from '../services/geminiService';
import { AppContext } from '../contexts/AppContext';
import { TimelineEntry, Message, UserTimelineEntry, ConceptTimelineEntry } from '../types';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

// Make pdfjsLib available from the CDN
declare const pdfjsLib: any;

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
    const { userProfile, setTutorHistory, addTimelineEntry } = useContext(AppContext);
    const messages = userProfile?.tutorHistory || [];

    const [input, setInput] = useState('');
    const [file, setFile] = useState<File | null>(null);
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
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const supportedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
            if (supportedTypes.includes(selectedFile.type)) {
                setFile(selectedFile);
            } else {
                toast.error('Unsupported file. Please upload a JPG, PNG, or PDF.');
            }
        }
    };

    const handleSend = async () => {
        if ((input.trim() === '' && !file) || isLoading || !userProfile) return;

        setIsLoading(true);
        
        const userMessage: Message = { 
            id: uuidv4(), 
            text: input, 
            sender: 'user',
        };
        
        const currentHistory = [...messages, userMessage];
        setTutorHistory(currentHistory);

        let fileInputForApi: { mimeType: string; data: string } | { text: string } | null = null;

        if (file) {
            userMessage.file = { name: file.name, type: file.type };
            if (file.type === 'application/pdf') {
                try {
                    const pdfText = await extractPdfText(file);
                    fileInputForApi = { text: `\n\n---START OF PDF CONTENT---\n${pdfText}\n---END OF PDF CONTENT---` };
                } catch (e) {
                    console.error("PDF processing failed:", e);
                    toast.error("Could not read the PDF file. It might be corrupted or too complex.");
                    setIsLoading(false);
                    return;
                }
            } else { // It's an image
                try {
                    const base64Data = await toBase64(file);
                    fileInputForApi = { mimeType: file.type, data: base64Data };
                    userMessage.file.base64Data = base64Data;
                } catch (error) {
                    toast.error("Could not process file. Please try again.");
                    setIsLoading(false);
                    return;
                }
            }
        }
        
        setInput('');
        setFile(null);

        try {
            const aiResponseText = await getAdaptiveResponse(userProfile, messages, input, fileInputForApi);
            
            // Handle potential timeline actions embedded in the response
            const timelineRegex = /<TIMELINE_ENTRY>([\s\S]*?)<\/TIMELINE_ENTRY>/;
            const match = aiResponseText.match(timelineRegex);

            if (match && match[1]) {
                try {
                    const timelineJson = JSON.parse(match[1]);
                    const newEntry: UserTimelineEntry = {
                        id: uuidv4(),
                        type: 'user',
                        ...timelineJson
                    };
                    addTimelineEntry(newEntry);
                    toast.success(`🗓️ Tutor added "${newEntry.title}" to your timeline!`);
                } catch (e) {
                    console.error("Failed to parse timeline entry from AI response:", e);
                }
            }
            
            const aiMessage: Message = { id: uuidv4(), text: aiResponseText.replace(timelineRegex, '').trim(), sender: 'model' };
            setTutorHistory([...currentHistory, aiMessage]);

        } catch (error) {
            console.error(error);
            const errorMessage: Message = { id: uuidv4(), text: "Sorry, I'm having trouble connecting. Please try again.", sender: 'model' };
            setTutorHistory([...currentHistory, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAddToTimeline = (message: Message) => {
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

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
            <header className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold">AI Tutor</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Ask a question or upload an image/PDF for analysis.</p>
            </header>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xl p-4 rounded-xl relative group ${msg.sender === 'user' ? 'bg-green-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                            {msg.file && (
                                <div className="mb-2">
                                    {msg.file.base64Data ? (
                                         <img src={`data:${msg.file.type};base64,${msg.file.base64Data}`} alt={msg.file.name} className="rounded-lg max-h-48" />
                                    ) : (
                                        <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-sm flex items-center">
                                            📄 <span className="ml-2 font-semibold">{msg.file.name}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                            {msg.sender === 'model' && (
                                <button onClick={() => handleAddToTimeline(msg)} title="Add to Timeline" className="absolute -top-2 -right-2 bg-white dark:bg-gray-600 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                                    🗓️
                                </button>
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
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                {file && (
                    <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 p-2 rounded-md mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Attached: {file.name}</span>
                        <button onClick={() => setFile(null)} className="text-red-500 hover:text-red-700 text-xl">&times;</button>
                    </div>
                )}
                <div className="flex items-center">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/jpeg,image/png,application/pdf"
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 mr-2">
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
                    <button onClick={handleSend} disabled={isLoading || (input.trim() === '' && !file)} className="ml-4 px-6 py-2 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 disabled:bg-gray-400">
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdaptiveTutor;