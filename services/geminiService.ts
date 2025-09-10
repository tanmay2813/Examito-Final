
import { GoogleGenAI, Type } from "@google/genai";
import type { UserProfile, Question, Message, Report } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// --- PROMPTS and SCHEMAS ---

const TUTOR_SYSTEM_INSTRUCTION = (board: string) => `You are Examito, an expert AI tutor for a student studying the ${board} curriculum. Your primary goal is to foster deep understanding.
- **Socratic Method:** Instead of providing direct answers, guide students with leading questions to help them arrive at the solution themselves.
- **Adaptive Learning:** Adjust your teaching style based on the user's responses. If they struggle, offer simpler explanations and hints. If they show understanding, challenge them with more complex scenarios.
- **Direct Answers:** Only give a direct answer if the user explicitly asks for it (e.g., "give me the answer") or is clearly frustrated and stuck after several attempts.
- **Timeline Integration:** You can help users organize their studies. If a user asks to remember something or schedule a study session, respond ONLY with a JSON object inside <TIMELINE_ENTRY> tags. The JSON should have "title", "description", "date" (in YYYY-MM-DD format), and "reminderFrequency" ('daily', 'weekly', 'monthly', or 'none'). For example: <TIMELINE_ENTRY>{"title": "Review Photosynthesis", "description": "Go over the light-dependent and independent reactions.", "date": "2024-08-15", "reminderFrequency": "weekly"}</TIMELINE_ENTRY>. Do not add any text outside of the tag if you use it.
- **File Analysis:** If provided with text from a file (like a PDF), or an image, use that content as the primary context for your response.`;

const questionSchema = {
    type: Type.OBJECT,
    properties: {
        questionText: { type: Type.STRING },
        options: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        correctAnswer: { type: Type.STRING },
        explanation: { type: Type.STRING }
    },
    required: ['questionText', 'options', 'correctAnswer', 'explanation']
};

const reportSchema = {
    type: Type.OBJECT,
    properties: {
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
        stepByStepPlan: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ['strengths', 'improvements', 'stepByStepPlan']
};


// --- API FUNCTIONS ---

export const getAdaptiveResponse = async (
    userProfile: UserProfile,
    history: Message[],
    newPrompt: string,
    fileInput: { mimeType: string; data: string } | { text: string } | null
): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const systemInstruction = TUTOR_SYSTEM_INSTRUCTION(userProfile.board);

    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    const userParts: any[] = [{ text: newPrompt }];
    if (fileInput) {
        if ('mimeType' in fileInput) { // Image
            userParts.push({ inlineData: { mimeType: fileInput.mimeType, data: fileInput.data } });
        } else { // PDF text
            userParts.push({ text: fileInput.text });
        }
    }
    contents.push({ role: 'user', parts: userParts });
    
    const response = await ai.models.generateContent({
        model,
        contents,
        config: { systemInstruction }
    });

    return response.text;
};

export const generateTestQuestions = async (subject: string, board: string, topic: string, numQuestions: number): Promise<Question[]> => {
    const prompt = `Generate ${numQuestions} multiple-choice questions for a test on the topic "${topic}" for a student studying the ${board} curriculum in the subject ${subject}. Each question should have 4 options. Provide a brief explanation for the correct answer.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: questionSchema
            }
        }
    });

    const questions = JSON.parse(response.text);
    return questions;
};

export const generateDailyQuestions = async (board: string): Promise<Question[]> => {
    const prompt = `Generate 5 multiple-choice questions on general knowledge topics suitable for a student studying the ${board} curriculum. The topics should be varied and interesting. Each question must have 4 options. Provide the correct answer and a brief explanation for each.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: questionSchema
            }
        }
    });
    
    const questions = JSON.parse(response.text);
    return questions;
};

export const generateProgressReport = async (userProfile: UserProfile): Promise<Omit<Report, 'reportId' | 'dateGenerated'>> => {
    const testHistorySummary = userProfile.tests.map(t => ({
        subject: t.subject,
        score: t.score,
        date: t.dateTaken,
        correct: t.correctAnswers,
        total: t.totalQuestions
    }));

    const prompt = `Analyze the following student data to generate a comprehensive progress report.
    Student Name: ${userProfile.name}
    Academic Board: ${userProfile.board}
    Test History: ${JSON.stringify(testHistorySummary, null, 2)}

    Based on this data, provide:
    1. A list of strengths (topics where the student consistently scores well).
    2. A list of areas for improvement (topics with lower scores or repeated mistakes).
    3. A personalized, actionable step-by-step plan for the next week to address the areas for improvement. The plan should be encouraging and include specific study techniques or resources to try.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: reportSchema
        }
    });

    const reportData = JSON.parse(response.text);
    return reportData;
};

// FIX: Add the missing analyzeFileContent function for the FileAnalyzer component.
export const analyzeFileContent = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    const imagePart = {
        inlineData: {
            mimeType,
            data: base64Data,
        },
    };
    const textPart = {
        text: prompt,
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, textPart] },
    });

    return response.text;
};
