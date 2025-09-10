
import React, { useState } from 'react';
import { analyzeFileContent } from '../services/geminiService';
import toast from 'react-hot-toast';

const FileAnalyzer: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('Summarize the key points from this document.');
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');
    const [fileName, setFileName] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const supportedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
            if (supportedTypes.includes(selectedFile.type)) {
                setFile(selectedFile);
                setFileName(selectedFile.name);
            } else {
                toast.error('Unsupported file type. Please upload a JPG, PNG, or PDF.');
                e.target.value = '';
            }
        }
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

    const handleAnalyze = async () => {
        if (!file || !prompt) {
            toast.error('Please select a file and enter a prompt.');
            return;
        }

        setIsLoading(true);
        setAnalysisResult('');
        
        // For PDF, we ask user to screenshot for simplicity.
        if (file.type === 'application/pdf') {
             toast.error('For PDFs, please take a screenshot of the relevant page and upload it as a PNG or JPG.');
             setIsLoading(false);
             return;
        }

        try {
            const base64Data = await toBase64(file);
            const result = await analyzeFileContent(base64Data, file.type, prompt);
            setAnalysisResult(result);
            toast.success('Analysis complete!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to analyze the file. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-4xl font-bold">File Analyzer</h1>
            <p className="text-gray-600 dark:text-gray-300">Upload a document (JPG, PNG) to extract insights, get summaries, or generate questions.</p>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">1. Upload your file</label>
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <svg className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">JPG, PNG</p>
                                {fileName && <p className="text-sm text-indigo-500 mt-2">{fileName}</p>}
                            </div>
                            <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/jpeg,image/png,application/pdf" />
                        </label>
                    </div> 
                </div>

                <div>
                    <label htmlFor="prompt" className="block text-sm font-medium mb-2">2. What should I do with it?</label>
                    <input
                        id="prompt"
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="w-full px-3 py-2 text-gray-800 bg-gray-50 border border-gray-300 rounded-md shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                    />
                </div>
                
                <button
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-gray-400"
                >
                    {isLoading ? 'Analyzing...' : 'Analyze File'}
                </button>
            </div>

            {analysisResult && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4">Analysis Result</h3>
                    <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300" style={{whiteSpace: 'pre-wrap'}}>
                       {analysisResult}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileAnalyzer;
   