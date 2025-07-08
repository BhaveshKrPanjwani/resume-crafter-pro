const BACKEND_URL = 'https://server-mu-smoky.vercel.app';

export const analyzeResume = async (resumeData) => {
  try {
    const response = await fetch(`${BACKEND_URL}/api/openai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3-8b",
        messages: [
          {
            role: "system",
            content: "You are a professional resume analyzer. Give suggestions to improve the resume."
          },
          {
            role: "user",
            content: JSON.stringify(resumeData)
          }
        ],
        temperature: 0.5,
        max_tokens: 500
      }),
    });

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    return {
      score: Math.floor(Math.random() * 30) + 70,
      suggestions: content?.split('\n').filter(line => line.trim().length > 0) || []
    };
  } catch (error) {
    console.error('Error analyzing resume:', error);
    return {
      score: 0,
      suggestions: ['Failed to analyze resume. Please try again.']
    };
  }
};
