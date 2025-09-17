


import { GoogleGenAI, Type } from "@google/genai";
import type { UserProfile, Question, Message, Report, DailyGoal, Flashcard, StudyBuddyPersona, StudyPlan, LearningStyle } from '../types';
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

const getTutorSystemInstruction = (board: string, persona: StudyBuddyPersona, learningStyle: LearningStyle) => {
    let baseInstruction = `You are Examito, an expert AI tutor for a student studying the ${board} curriculum.
- **Math Formatting:** When writing mathematical equations or formulas, use LaTeX syntax. For block equations, enclose them in \`$$\`...\`$$\`. For inline equations, use \`$\`...\`$\`.
- **Timeline Integration:** You can help users organize their studies. If a user asks to remember something or schedule a study session, respond ONLY with a JSON object inside <TIMELINE_ENTRY> tags. The JSON should have "title", "description", "date" (in YYYY-MM-DD format), and "reminderFrequency" ('daily', 'weekly', 'monthly', or 'none'). For example: <TIMELINE_ENTRY>{"title": "Review Photosynthesis", "description": "Go over the light-dependent and independent reactions.", "date": "2024-08-15", "reminderFrequency": "weekly"}</TIMELINE_ENTRY>. Do not add any text outside of the tag if you use it.
- **File Analysis:** If provided with text from a file (like a PDF), or an image, use that content as the primary context for your response.
- **Interactive Quizzing:** To check for understanding, you can occasionally embed a single multiple-choice question mini-quiz in your response. To do this, respond ONLY with a JSON object inside <QUIZ> tags. The JSON should be an array containing one question object with "questionText", "options" (4 of them), and "correctAnswer". Example: <QUIZ>[{"questionText": "What is the powerhouse of the cell?", "options": ["Mitochondria", "Nucleus", "Ribosome", "Chloroplast"], "correctAnswer": "Mitochondria"}]</QUIZ>. Do not add any text outside of the tag if you use it.`;
    
    switch(persona) {
        case 'encourager':
            baseInstruction += `\n- **Persona: The Encourager.** Your primary goal is to be positive and build confidence. Use uplifting language. Celebrate small wins. When a student struggles, reassure them that it's okay and gently guide them. Frame feedback constructively.`;
            break;
        case 'challenger':
            baseInstruction += `\n- **Persona: The Challenger.** Your primary goal is to push the student to think critically and deeply. Be more direct. After a correct answer, ask a difficult follow-up question to test their true understanding. Challenge their assumptions.`;
            break;
        case 'tutor':
        default:
            baseInstruction += `\n- **Persona: The Socratic Tutor.** Your primary goal is to foster deep understanding. Instead of providing direct answers, guide students with leading questions to help them arrive at the solution themselves. Only give a direct answer if the user explicitly asks for it or is clearly frustrated.`;
            break;
    }

    if (learningStyle !== 'none') {
        baseInstruction += `\n- **Learning Style Adaptation:** The user has identified as a '${learningStyle}' learner. Tailor your explanations accordingly. For 'visual' learners, use descriptive language that helps them form mental images and suggest drawing diagrams. For 'read/write' learners, provide structured, text-heavy explanations. For 'aural' learners, suggest they read concepts aloud. For 'kinesthetic' learners, relate concepts to real-world, hands-on examples.`;
    }
    
    return baseInstruction;
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
                        task: { type: Type.STRING, description: "The specific study task for that day." },
                        activity: { type: Type.STRING, description: "An optional suggested activity from this list: ['tutor', 'test', 'flashcards', 'read'] to help with the task.", optional: true },
                        topic: { type: Type.STRING, description: "If an activity is suggested, this is the specific topic for that activity.", optional: true }
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
    const systemInstruction = getTutorSystemInstruction(userProfile.board, userProfile.studyBuddyPersona, userProfile.learningStyle);

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

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};


export const generateProgressReport = async (userProfile: UserProfile): Promise<Omit<Report, 'reportId' | 'dateGenerated'>> => {
    const ai = getAi();
    const prompt = `Based on the following user data, generate a progress report. The user is studying ${userProfile.board}. Analyze their test history and mastery scores. Identify clear strengths, areas for improvement, and provide an actionable, step-by-step plan for the next week. User data: ${JSON.stringify({ tests: userProfile.tests.slice(-5), mastery: userProfile.mastery })}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: reportSchema
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};

export const generateFlashcards = async (text: string): Promise<Omit<Flashcard, 'id' | 'dueDate' | 'interval' | 'easeFactor'>[]> => {
    const ai = getAi();
    const prompt = `Create flashcards based on the key concepts in this text. For each flashcard, provide a front (question/term), a back (answer/definition), and a general subject. Text: "${text}"`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: flashcardSchema
            }
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
}

export const getSimplifiedResponse = async (text: string): Promise<string> => {
    const ai = getAi();
    const prompt = `Explain the following concept in simpler terms, as if for a beginner: "${text}"`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
};


export const generateDailyQuestions = async (board: string): Promise<Question[]> => {
    const ai = getAi();
    const prompt = `Generate 5 diverse, multiple-choice questions suitable for a quick daily challenge for a student studying the ${board} curriculum. The questions should cover a range of common subjects. Each question should have 4 options.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        questionText: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING }
                    },
                    required: ['questionText', 'options', 'correctAnswer']
                }
            }
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
};

export const generateDailyGoals = async (userProfile: UserProfile): Promise<DailyGoal[]> => {
    const ai = getAi();
    const prompt = `Generate 3 short, personalized daily goals for a student. Consider their recent activity if provided. The goals should be actionable and motivating. Assign an XP value between 10 and 50 for each. Recent topics: ${Object.keys(userProfile.mastery).join(', ')}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: dailyGoalsSchema
        }
    });

    const jsonText = response.text.trim();
    const goalsData: { description: string, xp: number }[] = JSON.parse(jsonText);
    return goalsData.map(g => ({ ...g, id: uuidv4(), isCompleted: false }));
};

export const getMistakeExplanation = async (question: string, userAnswer: string, correctAnswer: string, options: string[]): Promise<string> => {
    const ai = getAi();
    const prompt = `A student answered a question incorrectly. Explain the potential misconception behind their specific wrong answer.
    Question: "${question}"
    Options: ${options.join(', ')}
    Student's incorrect answer: "${userAnswer}"
    Correct answer: "${correctAnswer}"
    Focus on why the student might have chosen their answer and gently guide them to the correct logic.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
};

export const generateSmartReviewSelection = async (userProfile: UserProfile, availableSubjects: string[]): Promise<string[]> => {
    const ai = getAi();
    const weakTopics = Object.entries(userProfile.mastery)
        .filter(([, score]) => score < 75)
        .map(([topic]) => topic);
    
    if (weakTopics.length === 0) return [];
    
    const prompt = `From this list of available flashcard subjects: [${availableSubjects.join(', ')}], which 2-3 subjects would be most beneficial for a student to review, given that their weakest topics are [${weakTopics.join(', ')}]? Respond with only a comma-separated list of the recommended subjects.`;

    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text.split(',').map(s => s.trim()).filter(Boolean);
};

export const generateDailyTeaser = async (board: string): Promise<string> => {
    const ai = getAi();
    const prompt = `Generate one short, fun, and interesting brain teaser or fun fact relevant to a student studying the ${board} curriculum. Make it engaging.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
};

export const generateDashboardInsight = async (userProfile: UserProfile): Promise<string> => {
    const ai = getAi();
    const prompt = `Based on this user's learning data, generate a single, concise, and encouraging insight for their dashboard. Highlight a recent success or a positive trend. Data: ${JSON.stringify({ streak: userProfile.streak, mastery: userProfile.mastery, recent_tests: userProfile.tests.slice(-3) })}`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text;
};

export const generateStudyPlan = async (examName: string, examDate: string, topics: string[], board: string, startDate: string): Promise<{ plan: StudyPlan['plan'] }> => {
    const ai = getAi();
    const prompt = `Create a structured study plan for a student studying the ${board} curriculum.
- Exam Name: ${examName}
- Exam Date: ${examDate}
- Plan Start Date: ${startDate}
- Topics to Cover: ${topics.join(', ')}

Break the plan into weeks. For each day of the week, provide a specific, actionable task. For some tasks, suggest a relevant in-app activity ('tutor', 'test', 'flashcards') and the corresponding 'topic' for that activity. This will help the user take direct action.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    plan: studyPlanSchema,
                },
                required: ["plan"]
            }
        }
    });
    
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
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
