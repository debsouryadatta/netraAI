/**
 * Google Gemini Integration for Chat
 * Using @google/genai SDK (latest)
 */

import { GoogleGenAI } from '@google/genai'
import { getSystemInstruction, getGreetingMessage, languageNames, type SupportedLanguage } from './language-detector'

const genAI = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY || '',
})

export async function generateAIResponse(
  userMessage: string,
  conversationId: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  currentLanguage: SupportedLanguage = 'kannada',
  images?: Array<{ data: string; mimeType: string }>
): Promise<string> {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not configured')
  }

  try {
    // Get system instruction for current language
    const systemInstruction = getSystemInstruction(currentLanguage)
    const greetingMessage = getGreetingMessage(currentLanguage)

    const history = conversationHistory.slice(-10) // Keep last 10 messages for context

    // Build conversation history as Content array
    // Format: [{ role: 'user', parts: [{ text: '...' }] }, { role: 'model', parts: [{ text: '...' }] }]
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> }> = [
      {
        role: 'user',
        parts: [{ text: systemInstruction }],
      },
      {
        role: 'model',
        parts: [{ text: greetingMessage }],
      },
      ...history.map((msg) => ({
        role: (msg.role === 'user' ? 'user' : 'model') as 'user' | 'model',
        parts: [{ text: msg.content }],
      })),
    ]

    // Build the current user message with optional images
    const userMessageParts: Array<{ text?: string; inlineData?: { data: string; mimeType: string } }> = []
    
    // Add images first if provided (so AI sees them before the question)
    if (images && images.length > 0) {
      images.forEach((image) => {
        userMessageParts.push({
          inlineData: {
            data: image.data,
            mimeType: image.mimeType,
          },
        })
      })
    }
    
    // Add text if provided (after images so context is clear)
    if (userMessage) {
      userMessageParts.push({ text: userMessage })
    } else if (images && images.length > 0) {
      // If only images are provided without text, add a prompt to describe/analyze
      const imagePrompt = currentLanguage === 'kannada'
        ? 'ಈ ಚಿತ್ರದಲ್ಲಿ ಏನಿದೆ? ವಿವರವಾಗಿ ವಿವರಿಸಿ.'
        : currentLanguage === 'hindi'
        ? 'इस छवि में क्या है? विस्तार से वर्णन करें।'
        : 'What is in this image? Please describe it in detail.'
      userMessageParts.push({ text: imagePrompt })
    }

    contents.push({
      role: 'user',
      parts: userMessageParts,
    })

    // Use the new @google/genai SDK API
    // According to GitHub docs: ai.models.generateContent({ model, contents, config })
    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash', // Using Gemini 2.0 Flash model
      contents,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    })

    const text = response.text

    // Fallback message in current language
    const fallbackMessages: Record<SupportedLanguage, string> = {
      kannada: 'ಕ್ಷಮಿಸಿ, ಪ್ರತಿಕ್ರಿಯೆ ಪಡೆಯಲು ವಿಫಲವಾಗಿದೆ.',
      english: 'Sorry, failed to get a response.',
      hindi: 'क्षमा करें, प्रतिक्रिया प्राप्त करने में विफल रहे।',
      tamil: 'மன்னிக்கவும், பதிலைப் பெற முடியவில்லை.',
      telugu: 'క్షమించండి, ప్రతిస్పందన పొందడంలో విఫలమైంది.',
      marathi: 'क्षमा करा, प्रतिक्रिया मिळविण्यात अयशस्वी झाली.',
      gujarati: 'માફ કરો, પ્રતિસાદ મેળવવામાં નિષ્ફળ થયું.',
      bengali: 'দুঃখিত, প্রতিক্রিয়া পাওয়া যায়নি।',
      malayalam: 'ക്ഷമിക്കണം, പ്രതികരണം നേടാനായില്ല.',
      punjabi: 'ਮਾਫ਼ ਕਰੋ, ਜਵਾਬ ਪ੍ਰਾਪਤ ਕਰਨ ਵਿੱਚ ਅਸਫਲ ਰਹੇ।',
      urdu: 'معذرت، جواب حاصل کرنے میں ناکام رہے۔',
      sanskrit: 'क्षम्यताम्, प्रतिक्रियां प्राप्तुं असफलः।',
    }

    return text || fallbackMessages[currentLanguage]
  } catch (error) {
    console.error('Gemini API error:', error)
    throw new Error('Failed to generate AI response. Please try again.')
  }
}

/**
 * Describe an image using Gemini Vision API
 */
export async function describeImage(
  imageBase64: string,
  currentLanguage: SupportedLanguage = 'kannada'
): Promise<string> {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not configured')
  }

  try {
    // Validate base64 string
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new Error('Invalid image data provided')
    }

    // Vision-specific prompt based on language
    const visionPrompt = currentLanguage === 'kannada' 
      ? 'ಈ ಚಿತ್ರದಲ್ಲಿರುವ ವಸ್ತುವನ್ನು ವಿವರಿಸಿ. ವಸ್ತುವು ಏನು ಮಾಡುತ್ತದೆ ಅಥವಾ ಅದರ ಬಗ್ಗೆ ಸಂಕ್ಷಿಪ್ತ ವಿವರಣೆಯನ್ನು ನೀಡಿ.'
      : currentLanguage === 'english'
      ? 'Describe the object in this image. What does the object do or provide a brief description about it.'
      : currentLanguage === 'hindi'
      ? 'इस छवि में वस्तु का वर्णन करें। वस्तु क्या करती है या इसके बारे में संक्षिप्त विवरण दें।'
      : 'Describe the object in this image. What does the object do or provide a brief description about it.'

    // Use Gemini Vision API with image
    // Note: imageBase64 should already be clean base64 (without data URL prefix)
    // Ensure base64 string doesn't have any whitespace or newlines
    const cleanBase64 = imageBase64.replace(/\s/g, '')
    
    // Validate base64 format
    if (cleanBase64.length === 0) {
      throw new Error('Empty image data')
    }
    
    // Basic base64 validation (should only contain base64 characters)
    if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
      throw new Error('Invalid base64 format')
    }
    
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash', // Use the same model as chat (supports vision)
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `You are a helpful AI tutor called "Netra AI". ${visionPrompt} Respond in ${languageNames[currentLanguage]} language.`,
            },
            {
              inlineData: {
                data: cleanBase64, // Clean base64 string without whitespace
                mimeType: 'image/jpeg',
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    })

    const text = response.text

    // Fallback message in current language
    const fallbackMessages: Record<SupportedLanguage, string> = {
      kannada: 'ಕ್ಷಮಿಸಿ, ಚಿತ್ರವನ್ನು ವಿವರಿಸಲು ವಿಫಲವಾಗಿದೆ.',
      english: 'Sorry, failed to describe the image.',
      hindi: 'क्षमा करें, छवि का वर्णन करने में विफल रहे।',
      tamil: 'மன்னிக்கவும், படத்தை விவரிக்க முடியவில்லை.',
      telugu: 'క్షమించండి, చిత్రాన్ని వివరించడంలో విఫలమైంది.',
      marathi: 'क्षमा करा, प्रतिमा वर्णन करण्यात अयशस्वी झाली.',
      gujarati: 'માફ કરો, છબીનું વર્ણન કરવામાં નિષ્ફળ થયું.',
      bengali: 'দুঃখিত, ছবিটি বর্ণনা করতে ব্যর্থ হয়েছে।',
      malayalam: 'ക്ഷമിക്കണം, ചിത്രം വിവരിക്കാനായില്ല.',
      punjabi: 'ਮਾਫ਼ ਕਰੋ, ਚਿੱਤਰ ਦਾ ਵਰਣਨ ਕਰਨ ਵਿੱਚ ਅਸਫਲ ਰਹੇ।',
      urdu: 'معذرت، تصویر کی وضاحت کرنے میں ناکام رہے۔',
      sanskrit: 'क्षम्यताम्, चित्रं वर्णयितुं असफलः।',
    }

    return text || fallbackMessages[currentLanguage]
  } catch (error: any) {
    console.error('Gemini Vision API error:', error)
    
    // Log more details about the error
    if (error.response) {
      console.error('Error response:', error.response)
    }
    if (error.message) {
      console.error('Error message:', error.message)
    }
    
    // Provide more specific error message
    const errorMessage = error.message || 'Failed to describe image. Please try again.'
    throw new Error(errorMessage)
  }
}

