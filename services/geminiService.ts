

import { GoogleGenAI, Type } from "@google/genai";
import type { UserProfile, Question, Message, Report, DailyGoal, Flashcard, ConceptMapNode, StudyBuddyPersona, StudyPlan } from '../types';
import { v4 as uuidv4 } from 'uuid';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * A helper function to get the initialized AI instance.
 * @returns The initialized GoogleGenAI instance.
 */
const getAi = (): GoogleGenAI => {
    return ai;
};


// --- PROMPTS and SCHEMAS ---

const getTutorSystemInstruction = (board: string, persona: StudyBuddyPersona) => {
    const baseInstruction = `You are Examito, an expert AI tutor for a student studying the ${board} curriculum.
- **Math Formatting:** When writing mathematical equations or formulas, use LaTeX syntax. For block equations, enclose them in \`$$\`...\`$$\`. For inline equations, use \`$\`...\`$\`.
- **Timeline Integration:** You can help users organize their studies. If a user asks to remember something or schedule a study session, respond ONLY with a JSON object inside <TIMELINE_ENTRY> tags. The JSON should have "title", "description", "date" (in YYYY-MM-DD format), and "reminderFrequency" ('daily', 'weekly', 'monthly', or 'none'). For example: <TIMELINE_ENTRY>{"title": "Review Photosynthesis", "description": "Go over the light-dependent and independent reactions.", "date": "2024-08-15", "reminderFrequency": "weekly"}</TIMELINE_ENTRY>. Do not add any text outside of the tag if you use it.
- **File Analysis:** If provided with text from a file (like a PDF), or an image, use that content as the primary context for your response.`;
    
    switch(persona) {
        case 'encourager':
            return `${baseInstruction}\n- **Persona: The Encourager.** Your primary goal is to be positive and build confidence. Use uplifting language. Celebrate small wins. When a student struggles, reassure them that it's okay and gently guide them. Frame feedback constructively.`;
        case 'challenger':
            return `${baseInstruction}\n- **Persona: The Challenger.** Your primary goal is to push the student to think critically and deeply. Be more direct. After a correct answer, ask a difficult follow-up question to test their true understanding. Challenge their assumptions.`;
        case 'tutor':
        default:
            return `${baseInstruction}\n- **Persona: The Socratic Tutor.** Your primary goal is to foster deep understanding. Instead of providing direct answers, guide students with leading questions to help them arrive at the solution themselves. Only give a direct answer if the user explicitly asks for it or is clearly frustrated.`;
    }
};

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

const flashcardSchema = {
    type: Type.OBJECT,
    properties: {
        front: { type: Type.STRING, description: "The question or term for the front of the a flashcard." },
        back: { type: Type.STRING, description: "The answer or definition for the back of the flashcard." },
        subject: { type: Type.STRING, description: "The general subject of the flashcard, e.g., 'Biology'."}
    },
    required: ['front', 'back', 'subject']
};

const dailyGoalsSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: "A short, actionable goal for the student." },
            xp: { type: Type.NUMBER, description: "XP reward for completing the goal, between 10 and 50." }
        },
        required: ['description', 'xp']
    }
};

const conceptMapSchema: any = {
    type: Type.OBJECT,
    properties: {
        topic: { type: Type.STRING, description: 'The central topic or root of the map.' },
        children: {
            type: Type.ARRAY,
            description: 'An array of sub-topics or related concepts.',
            items: {
                // This creates a recursive schema structure for nested children
                $ref: '#'
            }
        }
    },
    required: ['topic', 'children']
};

const studyPlanSchema = {
    type: Type.ARRAY,
    description: "A list of weekly plans.",
    items: {
        type: Type.OBJECT,
        properties: {
            week: { type: Type.NUMBER, description: "The week number of the study plan." },
            dailyTasks: {
                type: Type.ARRAY,
                description: "A list of tasks for each day of the week.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        day: { type: Type.STRING, description: "The day of the week (e.g., Monday)." },
                        task: { type: Type.STRING, description: "The specific study task for that day." }
                    },
                    required: ["day", "task"]
                }
            }
        },
        required: ["week", "dailyTasks"]
    }
};


// --- API FUNCTIONS ---

export const getAdaptiveResponse = async (
    userProfile: UserProfile,
    history: Message[],
    newPrompt: string,
    fileInputs: { mimeType: string; data: string }[] | null
): Promise<string> => {
    const ai = getAi();
    const model = 'gemini-2.5-flash';
    const systemInstruction = getTutorSystemInstruction(userProfile.board, userProfile.studyBuddyPersona);

    const contents = history.map(msg => {
        const parts: any[] = [];
        // Ensure text is always present, even if empty, as a part.
        parts.push({ text: msg.text || '' });

        if (msg.files) {
            msg.files.forEach(file => {
                if (file.base64Data) { // It's an image
                    parts.push({ inlineData: { mimeType: file.type, data: file.base64Data } });
                }
            });
        }
        
        return {
            role: msg.sender === 'user' ? 'user' : 'model',
            parts
        };
    });

    const userParts: any[] = [{ text: newPrompt }];
    if (fileInputs) {
        fileInputs.forEach(fileInput => {
             userParts.push({ inlineData: { mimeType: fileInput.mimeType, data: fileInput.data } });
        });
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
    const ai = getAi();
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
    const ai = getAi();
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
    const ai = getAi();
    const testHistorySummary = userProfile.tests.map(t => ({
        subject: t.subject,
        score: t.score,
        date: t.dateTaken,
        correct: t.correctAnswers,
        total: t.totalQuestions,
        type: t.isChallenge ? 'Challenge' : 'Test'
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

export const analyzeFileContent = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
    const ai = getAi();
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

export const generateFlashcards = async (text: string): Promise<Omit<Flashcard, 'id' | 'dueDate' | 'interval' | 'easeFactor'>[]> => {
    const ai = getAi();
    const prompt = `Based on the following text, create a set of 1 to 3 concise and relevant flashcards. For each, provide a 'front' (a question or term), a 'back' (the answer or definition), and identify the general 'subject'. Text: "${text}"`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: flashcardSchema
            },
        }
    });

    return JSON.parse(response.text);
};


export const generateDailyGoals = async (userProfile: UserProfile): Promise<DailyGoal[]> => {
    const ai = getAi();
    const topics = userProfile.tests.map(t => t.subject).join(', ') || 'general knowledge';
    const prompt = `Create exactly 3 short, achievable daily study goals for a student. The goals should be encouraging and related to these topics: ${topics}. One goal should be about reviewing a past topic, one about learning something new, and one related to practice.`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: dailyGoalsSchema,
        }
    });
    
    const goalData: { description: string, xp: number }[] = JSON.parse(response.text);
    return goalData.map(g => ({
        ...g,
        id: uuidv4(),
        isCompleted: false,
    }));
};

export const generateConceptMap = async (history: Message[]): Promise<ConceptMapNode> => {
    const ai = getAi();
    const conversation = history
        .filter(m => m.text && m.text.trim() !== '')
        .map(m => `${m.sender}: ${m.text}`)
        .join('\n');
    
    if (conversation.length < 50) {
        throw new Error("Conversation is too short to generate a meaningful concept map.");
    }
    
    const prompt = `Analyze the following conversation and generate a hierarchical concept map of the main topics and their sub-topics. The root node should be the main subject of the conversation. Keep topics concise.

    Conversation:
    ${conversation}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: conceptMapSchema
        }
    });

    return JSON.parse(response.text);
};

export const generateDailyTeaser = async (board: string): Promise<string> => {
    const ai = getAi();
    const prompt = `Generate a single, short, fun, and engaging brain teaser or "did you know?" fact suitable for a student studying the ${board} curriculum. Keep it under 200 characters.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    
    return response.text;
};

export const getSimplifiedResponse = async (textToSimplify: string): Promise<string> => {
    const ai = getAi();
    const prompt = `Explain the following text in very simple terms, as if you were talking to a beginner who is new to the topic. Use analogies if they are helpful.

    Text to simplify: "${textToSimplify}"`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    
    return `**✨ Here's a simpler take:**\n\n${response.text}`;
};

export const generateStudyPlan = async (examName: string, examDate: string, topics: string[], board: string, startDate: string): Promise<Pick<StudyPlan, 'plan'>> => {
    const ai = getAi();
    const prompt = `Create a structured, week-by-week study plan for a student studying the ${board} curriculum.
    
    - Exam Name: ${examName}
    - Exam Date: ${examDate}
    - Plan Start Date: ${startDate}
    - Topics to Cover: ${topics.join(', ')}

    The plan should be broken down into weeks, and each week should have tasks for Monday to Friday. Tasks should be specific and actionable (e.g., "Review Topic A flashcards", "Take a 10-question practice test on Topic B", "Read Chapter 3 on Topic C"). The plan should be realistic and build progressively from the start date.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: studyPlanSchema
        }
    });

    const planData = JSON.parse(response.text);
    return { plan: planData };
};

export const generateDashboardInsight = async (userProfile: UserProfile): Promise<string> => {
    const ai = getAi();
    const testSummary = userProfile.tests.slice(-5).map(t => `- Scored ${t.score}% on ${t.subject} on ${new Date(t.dateTaken).toLocaleDateString()}`).join('\n');
    const masterySummary = JSON.stringify(userProfile.mastery);
    const prompt = `Analyze this student's recent activity and provide one short, encouraging, and actionable insight for their dashboard. The insight should be a single sentence.
    
    Recent Tests:
    ${testSummary || "No recent tests."}
    
    Concept Mastery:
    ${masterySummary}
    
    Example Insights:
    "You're mastering Photosynthesis! Why not try a timed challenge to test your skills?"
    "Great job on your recent tests! Remember to review your flashcards for Algebra to keep the concepts fresh."
    "You've been studying consistently. Keep up the great work! Try the AI Tutor to explore a new topic today."
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
    });
    
    // Return only the first line of the response to ensure it's a single sentence.
    return response.text.split('\n')[0];
};