/**
 * Language Detection and Management
 * Detects language requests from user messages and provides system instructions
 */

export type SupportedLanguage =
  | 'kannada'
  | 'english'
  | 'hindi'
  | 'tamil'
  | 'telugu'
  | 'marathi'
  | 'gujarati'
  | 'bengali'
  | 'malayalam'
  | 'punjabi'
  | 'urdu'
  | 'sanskrit'

export const languageNames: Record<SupportedLanguage, string> = {
  kannada: 'Kannada',
  english: 'English',
  hindi: 'Hindi',
  tamil: 'Tamil',
  telugu: 'Telugu',
  marathi: 'Marathi',
  gujarati: 'Gujarati',
  bengali: 'Bengali',
  malayalam: 'Malayalam',
  punjabi: 'Punjabi',
  urdu: 'Urdu',
  sanskrit: 'Sanskrit',
}

export const languageNativeNames: Record<SupportedLanguage, string> = {
  kannada: 'ಕನ್ನಡ',
  english: 'English',
  hindi: 'हिंदी',
  tamil: 'தமிழ்',
  telugu: 'తెలుగు',
  marathi: 'मराठी',
  gujarati: 'ગુજરાતી',
  bengali: 'বাংলা',
  malayalam: 'മലയാളം',
  punjabi: 'ਪੰਜਾਬੀ',
  urdu: 'اردو',
  sanskrit: 'संस्कृतम्',
}

/**
 * Detects if user is requesting a language change
 * Returns the requested language or null if no change requested
 */
export function detectLanguageRequest(message: string): SupportedLanguage | null {
  const lowerMessage = message.toLowerCase().trim()

  // Common phrases for language switching
  const languagePatterns: Record<SupportedLanguage, RegExp[]> = {
    kannada: [
      /(?:speak|talk|reply|respond|answer|use|switch|change).*(?:in|to).*(?:kannada|kannad|ಕನ್ನಡ)/i,
      /(?:kannada|kannad|ಕನ್ನಡ).*(?:speak|talk|reply|respond|answer|use)/i,
      /^(?:speak|talk|reply|respond|answer|use).*(?:kannada|kannad|ಕನ್ನಡ)/i,
    ],
    english: [
      /(?:speak|talk|reply|respond|answer|use|switch|change).*(?:in|to).*(?:english|eng)/i,
      /(?:english|eng).*(?:speak|talk|reply|respond|answer|use)/i,
      /^(?:speak|talk|reply|respond|answer|use).*(?:english|eng)/i,
    ],
    hindi: [
      /(?:speak|talk|reply|respond|answer|use|switch|change).*(?:in|to).*(?:hindi|हिंदी)/i,
      /(?:hindi|हिंदी).*(?:speak|talk|reply|respond|answer|use)/i,
      /^(?:speak|talk|reply|respond|answer|use).*(?:hindi|हिंदी)/i,
    ],
    tamil: [
      /(?:speak|talk|reply|respond|answer|use|switch|change).*(?:in|to).*(?:tamil|தமிழ்)/i,
      /(?:tamil|தமிழ்).*(?:speak|talk|reply|respond|answer|use)/i,
      /^(?:speak|talk|reply|respond|answer|use).*(?:tamil|தமிழ்)/i,
    ],
    telugu: [
      /(?:speak|talk|reply|respond|answer|use|switch|change).*(?:in|to).*(?:telugu|తెలుగు)/i,
      /(?:telugu|తెలుగు).*(?:speak|talk|reply|respond|answer|use)/i,
      /^(?:speak|talk|reply|respond|answer|use).*(?:telugu|తెలుగు)/i,
    ],
    marathi: [
      /(?:speak|talk|reply|respond|answer|use|switch|change).*(?:in|to).*(?:marathi|मराठी)/i,
      /(?:marathi|मराठी).*(?:speak|talk|reply|respond|answer|use)/i,
      /^(?:speak|talk|reply|respond|answer|use).*(?:marathi|मराठी)/i,
    ],
    gujarati: [
      /(?:speak|talk|reply|respond|answer|use|switch|change).*(?:in|to).*(?:gujarati|ગુજરાતી)/i,
      /(?:gujarati|ગુજરાતી).*(?:speak|talk|reply|respond|answer|use)/i,
      /^(?:speak|talk|reply|respond|answer|use).*(?:gujarati|ગુજરાતી)/i,
    ],
    bengali: [
      /(?:speak|talk|reply|respond|answer|use|switch|change).*(?:in|to).*(?:bengali|বাংলা)/i,
      /(?:bengali|বাংলা).*(?:speak|talk|reply|respond|answer|use)/i,
      /^(?:speak|talk|reply|respond|answer|use).*(?:bengali|বাংলা)/i,
    ],
    malayalam: [
      /(?:speak|talk|reply|respond|answer|use|switch|change).*(?:in|to).*(?:malayalam|മലയാളം)/i,
      /(?:malayalam|മലയാളം).*(?:speak|talk|reply|respond|answer|use)/i,
      /^(?:speak|talk|reply|respond|answer|use).*(?:malayalam|മലയാളം)/i,
    ],
    punjabi: [
      /(?:speak|talk|reply|respond|answer|use|switch|change).*(?:in|to).*(?:punjabi|ਪੰਜਾਬੀ)/i,
      /(?:punjabi|ਪੰਜਾਬੀ).*(?:speak|talk|reply|respond|answer|use)/i,
      /^(?:speak|talk|reply|respond|answer|use).*(?:punjabi|ਪੰਜਾਬੀ)/i,
    ],
    urdu: [
      /(?:speak|talk|reply|respond|answer|use|switch|change).*(?:in|to).*(?:urdu|اردو)/i,
      /(?:urdu|اردو).*(?:speak|talk|reply|respond|answer|use)/i,
      /^(?:speak|talk|reply|respond|answer|use).*(?:urdu|اردو)/i,
    ],
    sanskrit: [
      /(?:speak|talk|reply|respond|answer|use|switch|change).*(?:in|to).*(?:sanskrit|संस्कृत)/i,
      /(?:sanskrit|संस्कृत).*(?:speak|talk|reply|respond|answer|use)/i,
      /^(?:speak|talk|reply|respond|answer|use).*(?:sanskrit|संस्कृत)/i,
    ],
  }

  // Check each language pattern
  for (const [language, patterns] of Object.entries(languagePatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(lowerMessage)) {
        return language as SupportedLanguage
      }
    }
  }

  return null
}

/**
 * Get system instruction for a specific language
 */
export function getSystemInstruction(language: SupportedLanguage): string {
  const languageName = languageNames[language]
  const nativeName = languageNativeNames[language]

  const instructions: Record<SupportedLanguage, string> = {
    kannada: `You are a helpful AI tutor called "Netra AI" (ನೇತ್ರ AI) that teaches subjects in simple Kannada (ಕನ್ನಡ). Always respond in Kannada language. Be friendly, clear, and educational. Break down complex topics into simple explanations that are easy to understand.`,
    english: `You are a helpful AI tutor called "Netra AI" that teaches subjects in simple English. Always respond in English language. Be friendly, clear, and educational. Break down complex topics into simple explanations that are easy to understand.`,
    hindi: `You are a helpful AI tutor called "Netra AI" (नेत्र AI) that teaches subjects in simple Hindi (हिंदी). Always respond in Hindi language. Be friendly, clear, and educational. Break down complex topics into simple explanations that are easy to understand.`,
    tamil: `You are a helpful AI tutor called "Netra AI" (நேத்ரா AI) that teaches subjects in simple Tamil (தமிழ்). Always respond in Tamil language. Be friendly, clear, and educational. Break down complex topics into simple explanations that are easy to understand.`,
    telugu: `You are a helpful AI tutor called "Netra AI" (నేత్ర AI) that teaches subjects in simple Telugu (తెలుగు). Always respond in Telugu language. Be friendly, clear, and educational. Break down complex topics into simple explanations that are easy to understand.`,
    marathi: `You are a helpful AI tutor called "Netra AI" (नेत्र AI) that teaches subjects in simple Marathi (मराठी). Always respond in Marathi language. Be friendly, clear, and educational. Break down complex topics into simple explanations that are easy to understand.`,
    gujarati: `You are a helpful AI tutor called "Netra AI" (નેત્ર AI) that teaches subjects in simple Gujarati (ગુજરાતી). Always respond in Gujarati language. Be friendly, clear, and educational. Break down complex topics into simple explanations that are easy to understand.`,
    bengali: `You are a helpful AI tutor called "Netra AI" (নেত্র AI) that teaches subjects in simple Bengali (বাংলা). Always respond in Bengali language. Be friendly, clear, and educational. Break down complex topics into simple explanations that are easy to understand.`,
    malayalam: `You are a helpful AI tutor called "Netra AI" (നേത്ര AI) that teaches subjects in simple Malayalam (മലയാളം). Always respond in Malayalam language. Be friendly, clear, and educational. Break down complex topics into simple explanations that are easy to understand.`,
    punjabi: `You are a helpful AI tutor called "Netra AI" (ਨੇਤਰ AI) that teaches subjects in simple Punjabi (ਪੰਜਾਬੀ). Always respond in Punjabi language. Be friendly, clear, and educational. Break down complex topics into simple explanations that are easy to understand.`,
    urdu: `You are a helpful AI tutor called "Netra AI" (نیترا AI) that teaches subjects in simple Urdu (اردو). Always respond in Urdu language. Be friendly, clear, and educational. Break down complex topics into simple explanations that are easy to understand.`,
    sanskrit: `You are a helpful AI tutor called "Netra AI" (नेत्र AI) that teaches subjects in simple Sanskrit (संस्कृतम्). Always respond in Sanskrit language. Be friendly, clear, and educational. Break down complex topics into simple explanations that are easy to understand.`,
  }

  return instructions[language]
}

/**
 * Get greeting message for a specific language
 */
export function getGreetingMessage(language: SupportedLanguage): string {
  const greetings: Record<SupportedLanguage, string> = {
    kannada: 'ಹೌದು, ನಾನು ನಿಮ್ಮ Netra AI. ನಿಮಗೆ ಯಾವುದೇ ವಿಷಯವನ್ನು ಸರಳವಾಗಿ ಕನ್ನಡದಲ್ಲಿ ವಿವರಿಸಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ. ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ!',
    english: 'Hello! I am your Netra AI. I am here to explain any subject to you in simple English. Please ask your question!',
    hindi: 'नमस्ते! मैं आपका Netra AI हूं। मैं यहां आपको सरल हिंदी में किसी भी विषय की व्याख्या करने के लिए हूं। कृपया अपना प्रश्न पूछें!',
    tamil: 'வணக்கம்! நான் உங்கள் Netra AI. எந்தவொரு பாடத்தையும் தமிழில் எளிமையாக விளக்க நான் இங்கே இருக்கிறேன். உங்கள் கேள்வியைக் கேளுங்கள்!',
    telugu: 'నమస్కారం! నేను మీ Netra AI. ఏదైనా విషయాన్ని తెలుగులో సరళంగా వివరించడానికి నేను ఇక్కడ ఉన్నాను. మీ ప్రశ్నను అడగండి!',
    marathi: 'नमस्कार! मी तुमचा Netra AI आहे. कोणत्याही विषयाचे सोप्या मराठीत स्पष्टीकरण देण्यासाठी मी येथे आहे. कृपया तुमचा प्रश्न विचारा!',
    gujarati: 'નમસ્તે! હું તમારો Netra AI છું. કોઈપણ વિષયને સરળ ગુજરાતીમાં સમજાવવા માટે હું અહીં છું. કૃપા કરીને તમારો પ્રશ્ન પૂછો!',
    bengali: 'নমস্কার! আমি আপনার Netra AI। যেকোনো বিষয়কে সহজ বাংলায় ব্যাখ্যা করার জন্য আমি এখানে আছি। অনুগ্রহ করে আপনার প্রশ্ন জিজ্ঞাসা করুন!',
    malayalam: 'നമസ്കാരം! ഞാൻ നിങ്ങളുടെ Netra AI ആണ്. ഏത് വിഷയവും ലളിതമായ മലയാളത്തിൽ വിശദീകരിക്കാൻ ഞാൻ ഇവിടെയുണ്ട്. ദയവായി നിങ്ങളുടെ ചോദ്യം ചോദിക്കുക!',
    punjabi: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ Netra AI ਹਾਂ। ਕਿਸੇ ਵੀ ਵਿਸ਼ੇ ਨੂੰ ਸਧਾਰਨ ਪੰਜਾਬੀ ਵਿੱਚ ਸਮਝਾਉਣ ਲਈ ਮੈਂ ਇੱਥੇ ਹਾਂ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਸਵਾਲ ਪੁੱਛੋ!',
    urdu: 'السلام علیکم! میں آپ کا Netra AI ہوں۔ کسی بھی موضوع کو آسان اردو میں سمجھانے کے لیے میں یہاں ہوں۔ براہ کرم اپنا سوال پوچھیں!',
    sanskrit: 'नमस्ते! अहं भवतः Netra AI अस्मि। कस्यापि विषयस्य सरलसंस्कृते व्याख्यानं कर्तुं अहं अत्र अस्मि। कृपया भवतः प्रश्नं पृच्छतु!',
  }

  return greetings[language]
}

