import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/realtime/config
 * Returns Live API configuration for authenticated users
 * Note: In production, use ephemeral tokens instead of exposing API keys
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.GOOGLE_REALTIME_API_KEY || process.env.GOOGLE_GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    // Return API key for client-side Live API connection
    // TODO: Replace with ephemeral tokens for production
    return NextResponse.json({
      apiKey,
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    })
  } catch (error) {
    console.error('Error getting config:', error)
    return NextResponse.json(
      { error: 'Failed to get config' },
      { status: 500 }
    )
  }
}

