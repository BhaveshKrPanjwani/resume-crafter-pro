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

        const chatCompletion = await groq.chat.completions.create({
            messages: messages,
            model: model,
        });

        res.json(chatCompletion.choices[0].message);
    } catch (error) {
        console.error('Error calling Groq API:', error);
        res.status(500).json({ error: 'Failed to communicate with Groq API', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Groq API Proxy listening on port ${port}`);
});