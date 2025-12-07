/**
 * Language Detection and System Instruction Generator
 * Detects language requests from user messages and generates appropriate system instructions
 */

export type SupportedLanguage = 'kannada' | 'english' | 'hindi' | 'tamil' | 'telugu' | 'marathi' | 'gujarati' | 'bengali'

const LANGUAGE_KEYWORDS: Record<SupportedLanguage, string[]> = {
  kannada: ['kannada', 'ಕನ್ನಡ', 'kannad', 'kn'],
  english: ['english', 'eng', 'en', 'inglish'],
  hindi: ['hindi', 'हिंदी', 'hind', 'hi'],
  tamil: ['tamil', 'தமிழ்', 'tamizh', 'ta'],
  telugu: ['telugu', 'తెలుగు', 'tel', 'te'],
  marathi: ['marathi', 'मराठी', 'mar', 'mr'],
  gujarati: ['gujarati', 'ગુજરાતી', 'guj', 'gu'],
  bengali: ['bengali', 'বাংলা', 'bangla', 'bn'],
}

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  kannada: 'Kannada',
  english: 'English',
  hindi: 'Hindi',
  tamil: 'Tamil',
  telugu: 'Telugu',
  marathi: 'Marathi',
  gujarati: 'Gujarati',
  bengali: 'Bengali',
}

/**
 * Detects if user is requesting a language change
 * Returns the requested language or null if no language request detected
 */
export function detectLanguageRequest(message: string): SupportedLanguage | null {
  const lowerMessage = message.toLowerCase().trim()
  
  // Check for explicit language requests
  for (const [lang, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
    for (const keyword of keywords) {
      // Patterns like "speak in english", "talk in hindi", "reply in kannada", etc.
      // Also check for variations like "speak english", "talk english", "english please", etc.
      if (
        lowerMessage.includes(`speak in ${keyword}`) ||
        lowerMessage.includes(`talk in ${keyword}`) ||
        lowerMessage.includes(`reply in ${keyword}`) ||
        lowerMessage.includes(`respond in ${keyword}`) ||
        lowerMessage.includes(`use ${keyword}`) ||
        lowerMessage.includes(`speak ${keyword}`) ||
        lowerMessage.includes(`talk ${keyword}`) ||
        lowerMessage.includes(`reply ${keyword}`) ||
        lowerMessage.includes(`respond ${keyword}`) ||
        lowerMessage.includes(`${keyword} please`) ||
        lowerMessage.includes(`please ${keyword}`) ||
        lowerMessage.includes(`in ${keyword}`) ||
        lowerMessage === keyword ||
        lowerMessage.startsWith(`${keyword} `) ||
        lowerMessage.startsWith(`in ${keyword} `) ||
        lowerMessage.includes(`switch to ${keyword}`) ||
        lowerMessage.includes(`change to ${keyword}`)
      ) {
        return lang as SupportedLanguage
      }
    }
  }
  
  return null
}

/**
 * Generates system instruction based on the language
 */
export function getSystemInstruction(language: SupportedLanguage = 'kannada'): string {
  const languageName = LANGUAGE_NAMES[language]
  
  const baseInstruction = `You are a helpful AI tutor called "Netra AI" that teaches subjects in simple ${languageName}. 
Always respond in ${languageName} language. Be friendly, clear, and educational. 
Break down complex topics into simple explanations that are easy to understand.`

  // Add language-specific instructions
  const languageSpecificInstructions: Record<SupportedLanguage, string> = {
    kannada: 'Always respond in Kannada (ಕನ್ನಡ). Use simple Kannada words that are easy to understand.',
    english: 'Always respond in English. Use simple English words that are easy to understand.',
    hindi: 'Always respond in Hindi (हिंदी). Use simple Hindi words that are easy to understand.',
    tamil: 'Always respond in Tamil (தமிழ்). Use simple Tamil words that are easy to understand.',
    telugu: 'Always respond in Telugu (తెలుగు). Use simple Telugu words that are easy to understand.',
    marathi: 'Always respond in Marathi (मराठी). Use simple Marathi words that are easy to understand.',
    gujarati: 'Always respond in Gujarati (ગુજરાતી). Use simple Gujarati words that are easy to understand.',
    bengali: 'Always respond in Bengali (বাংলা). Use simple Bengali words that are easy to understand.',
  }

  return `${baseInstruction}\n\n${languageSpecificInstructions[language]}`
}

/**
 * Gets the default greeting message in the specified language
 */
export function getDefaultGreeting(language: SupportedLanguage = 'kannada'): string {
  const greetings: Record<SupportedLanguage, string> = {
    kannada: 'ಹೌದು, ನಾನು ನಿಮ್ಮ Netra AI. ನಿಮಗೆ ಯಾವುದೇ ವಿಷಯವನ್ನು ಸರಳವಾಗಿ ಕನ್ನಡದಲ್ಲಿ ವಿವರಿಸಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ. ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ!',
    english: 'Yes, I am your Netra AI. I am here to explain any topic simply in English. Please ask your question!',
    hindi: 'हाँ, मैं आपका Netra AI हूँ। मैं यहाँ हूँ किसी भी विषय को सरल हिंदी में समझाने के लिए। कृपया अपना प्रश्न पूछें!',
    tamil: 'ஆம், நான் உங்கள் Netra AI. எந்தவொரு தலைப்பையும் எளிய தமிழில் விளக்க நான் இங்கே இருக்கிறேன். தயவுசெய்து உங்கள் கேள்வியைக் கேளுங்கள்!',
    telugu: 'అవును, నేను మీ Netra AI. ఏదైనా విషయాన్ని సరళమైన తెలుగులో వివరించడానికి నేను ఇక్కడ ఉన్నాను. దయచేసి మీ ప్రశ్నను అడగండి!',
    marathi: 'होय, मी तुमचा Netra AI आहे. कोणत्याही विषयाचे सोप्या मराठीत स्पष्टीकरण देण्यासाठी मी येथे आहे. कृपया तुमचा प्रश्न विचारा!',
    gujarati: 'હા, હું તમારો Netra AI છું. કોઈપણ વિષયને સરળ ગુજરાતીમાં સમજાવવા માટે હું અહીં છું. કૃપા કરીને તમારો પ્રશ્ન પૂછો!',
    bengali: 'হ্যাঁ, আমি আপনার Netra AI। যেকোনো বিষয় সহজ বাংলায় ব্যাখ্যা করার জন্য আমি এখানে আছি। অনুগ্রহ করে আপনার প্রশ্ন করুন!',
  }

  return greetings[language]
}

