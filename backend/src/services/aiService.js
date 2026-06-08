const axios = require('axios');

const GERMAN_PROMPT = (word, english) => `
You are a German language teacher. A student just forgot the word "${word}" (meaning: "${english}").

Generate ONE short, natural German example sentence using the word "${word}".
The sentence should:
- Be simple enough for A2-B1 level learners
- Clearly show the meaning of the word in context
- Be 8-12 words long

Respond with ONLY a JSON object in this exact format, no other text:
{
  "sentence": "The German sentence here.",
  "translation": "The English translation here."
}
`.trim();

async function generateExampleSentence(germanWord, englishWord) {
  const useCloud = process.env.USE_CLOUD_AI === 'true';

  if (useCloud) {
    return generateWithGroq(germanWord, englishWord);
  } else {
    return generateWithOllama(germanWord, englishWord);
  }
}

async function generateWithGroq(germanWord, englishWord) {
  try {
    console.log(`☁️  Groq: generating sentence for "${germanWord}"...`);

    const response = await axios.post(
  'https://api.groq.com/openai/v1/chat/completions',
  {
    model: "llama-3.3-70b-specdec",
    messages: [
      { 
        role: 'user', 
        content: GERMAN_PROMPT(germanWord, englishWord) 
      }
    ],
    max_tokens: 150,
    temperature: 0.7,
    response_format: { type: "json_object" }, 
  },
  {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    timeout: 15000,
  }
);

    const text = response.data?.choices?.[0]?.message?.content?.trim();
    return parseAIResponse(text, germanWord);

  } catch (error) {
    console.error('❌ Groq error:', error.message);
    return getFallback(germanWord, englishWord);
  }
}

async function generateWithOllama(germanWord, englishWord) {
  try {
    console.log(`🏠 Ollama: generating sentence for "${germanWord}"...`);

    const response = await axios.post(
      'http://localhost:11434/api/generate',
      {
        model: 'llama3.2',
        prompt: GERMAN_PROMPT(germanWord, englishWord),
        format: 'json',
        stream: false,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000,
      }
    );

    const text = response.data?.response?.trim();
    return parseAIResponse(text, germanWord);

  } catch (error) {
    console.error('❌ Ollama error:', error.message);
    return getFallback(germanWord, englishWord);
  }
}

function parseAIResponse(text, germanWord) {
  try {
    // Strip markdown code fences if model added them
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.sentence || !parsed.translation) {
      throw new Error('Missing fields in AI response');
    }

    return {
      sentence: parsed.sentence,
      translation: parsed.translation,
      source: 'ai',
    };
  } catch (err) {
    console.warn('⚠️ AI response parse failed, using fallback:', err.message);
    return getFallback(germanWord);
  }
}

function getFallback(germanWord, englishWord) {
  return {
    sentence: `Kannst du "${germanWord}" in einem Satz verwenden?`,
    translation: `Can you use "${germanWord}" in a sentence?`,
    source: 'fallback',
  };
}

module.exports = { generateExampleSentence };