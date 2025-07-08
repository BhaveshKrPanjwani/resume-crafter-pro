// C:\Resume-builder\resume-builder\server\server.js

// Change 'require' to 'import' for dotenv
import dotenv from 'dotenv';
// Change 'require' to 'import' for express
import express from 'express';
// Change 'require' to 'import' for cors
import cors from 'cors';
// Change 'require' to 'import' for groq-sdk
import Groq from 'groq-sdk';

dotenv.config(); // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

app.get('/', (req, res) => {
    res.send('Groq API Proxy is running!');
});

app.post('/chat', async (req, res) => {
    try {
        const { messages, model } = req.body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Messages array is required.' });
        }
        if (!model) {
            return res.status(400).json({ error: 'Model is required.' });
        }

        const chatCompletion = await groq.chat.com.pletions.create({
            messages: messages,
            model: model,
        });

        res.json(chatCompletion.choices[0].message);
    } catch (error) {
        console.error('Error calling Groq API:', error);
        res.status(500).json({ error: 'Failed to communicate with Groq API', details: error.message });
    }
});

// --- ADD THIS NEW ENDPOINT FOR COVER LETTER GENERATION ---
app.post('/generate-cover-letter', async (req, res) => {
    try {
        const { resume, job_description, model } = req.body;

        if (!resume || !job_description) {
            return res.status(400).json({ error: 'Resume data and job description are required.' });
        }
        if (!model) {
            return res.status(400).json({ error: 'Model is required.' });
        }

        // Craft a detailed prompt for Groq
        const prompt = `You are an AI assistant specialized in writing professional cover letters.
        Based on the following resume and job description, write a compelling cover letter.
        Focus on highlighting relevant skills and experiences from the resume that match the job requirements.
        Keep it concise, professional, and targeted.

        --- Resume ---
        ${JSON.stringify(resume, null, 2)}

        --- Job Description ---
        ${job_description}

        --- Cover Letter ---
        `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: model,
            temperature: 0.7, // Adjust for creativity
            max_tokens: 1500, // Adjust based on expected cover letter length
        });

        // The component expects a `letter.content` structure, so we return { content: "..." }
        res.json({ content: chatCompletion.choices[0].message.content });

    } catch (error) {
        console.error('Error generating cover letter:', error);
        res.status(500).json({ error: 'Failed to generate cover letter', details: error.message });
    }
});
app.post('/analyze-resume', async (req, res) => {
    try {
        const { resume, model } = req.body;

        if (!resume) {
            return res.status(400).json({ error: 'Resume data is required.' });
        }
        if (!model) {
            return res.status(400).json({ error: 'Model is required.' });
        }

        // Craft a detailed prompt for Groq for resume analysis
        const prompt = `You are an AI assistant specialized in providing constructive feedback on resumes.
        Review the following resume and provide a detailed analysis.
        Identify strengths, weaknesses, and specific suggestions for improvement in areas like:
        - Formatting and readability
        - Content clarity and conciseness
        - Keyword optimization (if a general job type is assumed, or state if unclear)
        - Action verbs usage
        - Quantifiable achievements
        - Overall impact

        Provide the output in a structured JSON format with a 'review' string and an array of 'suggestions' strings.

        --- Resume ---
        ${JSON.stringify(resume, null, 2)}

        --- Analysis ---
        `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: model,
            temperature: 0.5, // Keep it less creative for factual analysis
            max_tokens: 1500,
            response_format: { type: "json_object" } // Request JSON output if supported by model
        });

        // Attempt to parse the JSON response
        let analysisResult;
        try {
            analysisResult = JSON.parse(chatCompletion.choices[0].message.content);
        } catch (parseError) {
            console.error("Failed to parse JSON from Groq:", chatCompletion.choices[0].message.content);
            // Fallback if parsing fails, return raw content or a generic error
            return res.status(500).json({
                error: 'AI response was not valid JSON. Please try again.',
                rawContent: chatCompletion.choices[0].message.content
            });
        }

        res.json(analysisResult);

    } catch (error) {
        console.error('Error analyzing resume:', error);
        res.status(500).json({ error: 'Failed to analyze resume', details: error.message });
    }
});
// --- END OF NEW ENDPOINT ---

app.listen(port, () => {
    console.log(`Groq API Proxy listening on port ${port}`);
});