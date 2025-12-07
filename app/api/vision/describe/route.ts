import { auth } from '@clerk/nextjs/server'
import { describeImage } from '@/lib/ai-service'
import { type SupportedLanguage } from '@/lib/language-detector'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { imageBase64, currentLanguage } = await req.json()

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      )
    }

    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = imageBase64.includes(',') 
      ? imageBase64.split(',')[1] 
      : imageBase64

    const language: SupportedLanguage = (currentLanguage || 'kannada') as SupportedLanguage

    // Generate image description using Gemini Vision API
    const description = await describeImage(base64Data, language)

    return NextResponse.json({
      description,
      language,
    })
  } catch (error) {
    console.error('Error describing image:', error)
    return NextResponse.json(
      { error: 'Failed to describe image' },
      { status: 500 }
    )
  }
}

