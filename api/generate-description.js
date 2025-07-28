// In your server code (Vercel serverless function)
import { groq } from 'groq-sdk';

const groqClient = new groq.Client(process.env.GROQ_API_KEY);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL);
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { section, data } = req.body;
    
    const prompt = {
      experience: `Generate 3 achievement bullet points for ${data.position} at ${data.company}...`,
      project: `Generate 3 technical bullet points for ${data.title}...`
    }[section];

    const completion = await groqClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-70b-8192'
    });

    res.status(200).json({
      content: completion.choices[0]?.message?.content || ''
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Failed to generate description' });
  }
}