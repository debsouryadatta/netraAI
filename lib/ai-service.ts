/**
 * Google Gemini Integration for Chat
 * Using @google/genai SDK (latest)
 */

import { GoogleGenAI } from '@google/genai'
import { detectLanguageRequest, getSystemInstruction, getDefaultGreeting, type SupportedLanguage } from './language-detector'

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
})

export async function generateAIResponse(
  userMessage: string,
  conversationId: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
): Promise<string> {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not configured')
  }

  try {
    // Detect language request from current message or conversation history
    let currentLanguage: SupportedLanguage = 'kannada' // Default to Kannada
    
    // Check current message for language request
    const languageRequest = detectLanguageRequest(userMessage)
    if (languageRequest) {
      currentLanguage = languageRequest
    } else {
      // Check recent conversation history for language context
      const recentMessages = conversationHistory.slice(-5)
      for (const msg of recentMessages.reverse()) {
        if (msg.role === 'user') {
          const langReq = detectLanguageRequest(msg.content)
          if (langReq) {
            currentLanguage = langReq
            break
          }
        }
      }
    }

    // Build conversation history for context
    const systemInstruction = getSystemInstruction(currentLanguage)
    const defaultGreeting = getDefaultGreeting(currentLanguage)

    const history = conversationHistory.slice(-10) // Keep last 10 messages for context

    // Build conversation history as Content array
    // Format: [{ role: 'user', parts: [{ text: '...' }] }, { role: 'model', parts: [{ text: '...' }] }]
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [
      {
        role: 'user',
        parts: [{ text: systemInstruction }],
      },
      {
        role: 'model',
        parts: [{ text: defaultGreeting }],
      },
      ...history.map((msg): { role: 'user' | 'model'; parts: Array<{ text: string }> } => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ]

    // Use the new @google/genai SDK API
    // According to GitHub docs: ai.models.generateContent({ model, contents, config })
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash', // Latest model from @google/genai SDK
      contents,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    })

    const text = response.text

    // Fallback message based on current language
    const fallbackMessages: Record<SupportedLanguage, string> = {
      kannada: 'ಕ್ಷಮಿಸಿ, ಪ್ರತಿಕ್ರಿಯೆ ಪಡೆಯಲು ವಿಫಲವಾಗಿದೆ.',
      english: 'Sorry, failed to get a response.',
      hindi: 'क्षमा करें, प्रतिक्रिया प्राप्त करने में विफल।',
      tamil: 'மன்னிக்கவும், பதிலைப் பெற முடியவில்லை.',
      telugu: 'క్షమించండి, ప్రతిస్పందన పొందడంలో విఫలమైంది.',
      marathi: 'क्षमा करा, प्रतिसाद मिळविण्यात अयशस्वी.',
      gujarati: 'માફ કરશો, પ્રતિસાદ મેળવવામાં અસફળ.',
      bengali: 'দুঃখিত, প্রতিক্রিয়া পাওয়া যায়নি।',
    }

    return text || fallbackMessages[currentLanguage]
  } catch (error) {
    console.error('Gemini API error:', error)
    throw new Error('Failed to generate AI response. Please try again.')
  }
}

