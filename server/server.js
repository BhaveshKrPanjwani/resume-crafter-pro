import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Enhanced CORS configuration
// Replace your current CORS middleware with this:
app.use(cors({
  origin: [
    'http://localhost:5173', // Your Vite dev server
    'https://your-production-client.vercel.app' // Your production frontend
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).end();
});
// Handle preflight requests
app.options('*', cors());

app.use(express.json({ limit: "10mb" }));

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    version: '1.0.0',
    endpoints: ['/generate-description', '/chat', '/generate-cover-letter', '/analyze-resume'],
    services: ['Groq AI Integration']
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Chat completion endpoint
app.post("/chat", async (req, res) => {
  try {
    const { messages, model } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required" });
    }
    if (!model) {
      return res.status(400).json({ error: "Model is required" });
    }

    const chatCompletion = await groq.chat.completions.create({
      messages,
      model,
      temperature: 0.3,
      max_tokens: 1000,
    });

    res.json({
      content: chatCompletion.choices[0].message.content,
      usage: chatCompletion.usage,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Failed to process chat request",
      details: error.message,
    });
  }
});

// Description generation endpoint (NEW)
app.post("/generate-description", async (req, res) => {
  try {
    const { section, data } = req.body;

    if (!section || !data) {
      return res.status(400).json({ error: "Section and data are required" });
    }

    const prompt = {
      experience: `Generate 3 specific achievement bullet points for ${data.position} at ${data.company}. Each must:
- Start with "• "
- Include metrics (e.g. "improved X by 40%")
- Focus on technical accomplishments`,
      project: `Generate 3 technical bullet points for "${
        data.title
      }" using ${data.techStack?.join(", ")}. Requirements:
- Start with "• "
- Mention specific technologies
- Include quantifiable results`,
    }[section];

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            'Generate ONLY 3 bullet points that start with "• " and include specific numbers',
        },
        { role: "user", content: prompt },
      ],
      model: "llama3-70b-8192",
      temperature: 0.3,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response");

    // Format validation
    const bulletPoints = content
      .split("\n")
      .filter((line) => line.trim().startsWith("•"))
      .slice(0, 3);

    res.json({ content: bulletPoints.join("\n") });
  } catch (error) {
    console.error("Description generation error:", error);
    res.status(500).json({
      error: "Failed to generate description",
      details: error.message,
    });
  }
});

// Cover letter generation endpoint
app.post("/generate-cover-letter", async (req, res) => {
  try {
    const { section, prompt, data } = req.body; // Accept both prompt and data

    // Backwards compatibility
    const inputData = data || {
      position: req.body.position,
      company: req.body.company,
      title: req.body.title,
      techStack: req.body.techStack,
    };

    if (!section || (!prompt && !inputData)) {
      return res.status(400).json({
        error: "Section and either prompt or data are required",
        received: req.body,
      });
    }

    // Use provided prompt or generate from data
    const finalPrompt =
      prompt ||
      {
        experience: `Generate 3 specific achievement bullet points for ${inputData.position} at ${inputData.company}. Each must:
- Start with "• "
- Include metrics (e.g. "improved X by 40%")
- Focus on technical accomplishments`,
        project: `Generate 3 technical bullet points for "${
          inputData.title
        }" using ${inputData.techStack?.join(", ")}. Requirements:
- Start with "• "
- Mention specific technologies
- Include quantifiable results`,
      }[section];

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            'Generate ONLY 3 bullet points that start with "• " and include specific numbers',
        },
        { role: "user", content: finalPrompt },
      ],
      model: "llama3-70b-8192",
      temperature: 0.3,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from Groq API");

    // Format validation
    const bulletPoints = content
      .split("\n")
      .filter((line) => line.trim().startsWith("•"))
      .slice(0, 3);

    res.json({
      success: true,
      content: bulletPoints.join("\n"),
      model: "llama3-70b-8192",
    });
  } catch (error) {
    console.error("Description generation error:", error);
    res.status(500).json({
      error: "Failed to generate description",
      details: error.message,
      requestBody: req.body, // For debugging
    });
  }
});

// Resume analysis endpoint
app.post("/analyze-resume", async (req, res) => {
  try {
    const { resume, model = "llama3-70b-8192" } = req.body;

    if (!resume) {
      return res.status(400).json({ error: "Resume data is required" });
    }

    const prompt = `Analyze this resume and provide structured feedback:
    
    Resume:
    ${JSON.stringify(resume, null, 2)}
    
    Required Analysis:
    1. Strengths (3 bullet points)
    2. Weaknesses (3 bullet points)
    3. Specific improvement suggestions
    4. ATS compliance score (1-10)
    5. Overall impression (1 paragraph)`;

    const response = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model,
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    try {
      const analysis = JSON.parse(response.choices[0].message.content);
      res.json(analysis);
    } catch (parseError) {
      throw new Error("Failed to parse AI response");
    }
  } catch (error) {
    console.error("Resume analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze resume",
      details: error.message,
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(
    `Groq API Key: ${process.env.GROQ_API_KEY ? "Configured" : "MISSING"}`
  );
});

export default app; // Important for Vercel
