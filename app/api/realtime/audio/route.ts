import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { processRealtimeAudio } from '@/lib/realtime-service'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, audioData } = await req.json()

    if (!sessionId || !audioData) {
      return NextResponse.json(
        { error: 'Session ID and audio data are required' },
        { status: 400 }
      )
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const session = await prisma.realtimeSession.findUnique({
      where: { id: sessionId },
    })

    if (!session || session.userId !== dbUser.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Convert base64 audio data to ArrayBuffer
    const audioBuffer = Uint8Array.from(
      atob(audioData),
      (c) => c.charCodeAt(0)
    ).buffer

    // Process audio with Google Realtime API
    const result = await processRealtimeAudio(
      audioBuffer,
      session.transcript || '' // Using transcript field to store session token temporarily
    )

    // Update session transcript if available
    if (result.transcript) {
      await prisma.realtimeSession.update({
        where: { id: sessionId },
        data: {
          transcript: result.transcript,
        },
      })
    }

    return NextResponse.json({
      transcript: result.transcript,
      audioUrl: result.audioUrl,
    })
  } catch (error) {
    console.error('Error processing audio:', error)
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    )
  }
}

